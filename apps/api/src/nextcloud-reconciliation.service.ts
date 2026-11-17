import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { config, now } from './config';

type ReconcileOptions = { dryRun?: boolean; source?: 'api' | 'cli' | 'scheduled' | 'migration' };
type ReconcileAction = { assetId: string; action: 'verified' | 'upload' | 'move' | 'missing' | 'error'; from?: string | null; to?: string; error?: string };

const aliases: Record<string, string> = {
  'ATIVA VET': 'ATIVA',
  'X OISHI': 'OISHI',
  'PIZZARIA JEITINHO BRASILEIRO': 'JEITINHO BRASILEIRO',
  'THALITA BALBI': 'DRA THALITA BALBI',
  'CLINICA E CIRURGIA DE OLHOS MAYRINK': 'DR MAYRINK',
  'DR DANILO VARGAS': 'DR DANILO',
  'DROGARIA TOMAZ': 'DROGRARIA TOMAZ',
  'RESTAURANTE PESQUEIRO': 'PESQUEIRO MARINOPOLIS',
};

export const normalizeFolderName = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

@Injectable()
export class NextcloudReconciliationService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running?: Promise<any>;

  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  onModuleInit() {
    const minutes = config.nextcloud.reconcileIntervalMinutes;
    if (!this.storage.isNextcloudEnabled() || minutes <= 0) return;
    this.timer = setInterval(() => {
      void this.reconcile({ source: 'scheduled' }).catch((error) => console.error(JSON.stringify({ level: 'error', event: 'nextcloud_reconcile_failed', error: this.message(error) })));
    }, minutes * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async status() {
    const [bindings, states] = await Promise.all([
      this.prisma.clientStorageBinding.groupBy({ by: ['status'], _count: true }),
      this.prisma.asset.groupBy({ by: ['storageState'], _count: true }),
    ]);
    return { storage: this.storage.status(), bindings, assets: states, reconciliationRunning: !!this.running };
  }

  async listBindings() {
    const [clients, bindings] = await Promise.all([
      this.prisma.document.findMany({ where: { collection: 'clients' }, select: { id: true, data: true } }),
      this.prisma.clientStorageBinding.findMany({ orderBy: { folderName: 'asc' } }),
    ]);
    const names = new Map(clients.map((row) => [row.id, String((row.data as any)?.name || row.id)]));
    return bindings.map((binding) => ({ ...binding, clientName: names.get(binding.clientId) || binding.clientId }));
  }

  async setBinding(clientId: string, folder: string) {
    const client = await this.prisma.document.findUnique({ where: { collection_id: { collection: 'clients', id: clientId } } });
    if (!client) throw new Error('Cliente não encontrado.');
    const entries = await this.storage.listDirectoryEntries();
    const normalized = normalizeFolderName(folder);
    const entry = entries.find((item) => item.path === folder || normalizeFolderName(item.name) === normalized);
    if (!entry) throw new Error('A pasta informada não existe dentro da pasta principal do Nextcloud.');
    const conflict = await this.prisma.clientStorageBinding.findUnique({ where: { folderPath: entry.path } });
    if (conflict && conflict.clientId !== clientId) throw new Error('Essa pasta já está vinculada a outro cliente.');
    const timestamp = now();
    return this.prisma.clientStorageBinding.upsert({
      where: { clientId },
      create: { clientId, folderName: entry.name, folderPath: entry.path, status: 'active', createdAt: timestamp, updatedAt: timestamp, lastVerifiedAt: timestamp },
      update: { folderName: entry.name, folderPath: entry.path, status: 'active', updatedAt: timestamp, lastVerifiedAt: timestamp, lastError: null },
    });
  }

  async removeBinding(clientId: string) {
    await this.prisma.clientStorageBinding.deleteMany({ where: { clientId } });
    return { ok: true };
  }

  reconcile(options: ReconcileOptions = {}) {
    if (this.running) return this.running;
    this.running = this.runReconciliation(options).finally(() => { this.running = undefined; });
    return this.running;
  }

  private async runReconciliation(options: ReconcileOptions) {
    if (!this.storage.isNextcloudEnabled()) throw new Error('A integração com o Nextcloud não está habilitada.');
    const dryRun = !!options.dryRun;
    const startedAt = Date.now();
    const bindingResult = await this.reconcileBindings(dryRun);
    const [assets, documents] = await Promise.all([
      this.prisma.asset.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.document.findMany({ select: { collection: true, id: true, data: true } }),
    ]);
    const inferredClients = this.inferAssetClients(assets.map((asset) => asset.id), documents);
    const bindingMap = new Map(bindingResult.bindings.map((binding: any) => [binding.clientId, binding]));
    const actions: ReconcileAction[] = [];

    for (const asset of assets) {
      const clientId = asset.clientId || inferredClients.get(asset.id) || null;
      const binding: any = clientId ? bindingMap.get(clientId) : undefined;
      const targetFolder = binding?.status === 'active' ? binding.folderPath : this.storage.directoryPath(config.nextcloud.systemFolder);
      const target = this.storage.assetPath(targetFolder, asset.id, asset.mime);
      const current = asset.remotePath || target;
      const timestamp = now();
      try {
        let metadata = await this.storage.inspectRemote(current);
        if (!metadata.exists && current !== target) metadata = await this.storage.inspectRemote(target);
        if (metadata.exists) {
          if (metadata.path !== target) {
            actions.push({ assetId: asset.id, action: 'move', from: metadata.path, to: target });
            if (!dryRun) {
              await this.storage.moveRemote(metadata.path, target);
              metadata = { ...metadata, path: target };
            }
          } else if (metadata.size != null && metadata.size !== asset.size && await this.storage.hasLocalAsset(asset.id)) {
            actions.push({ assetId: asset.id, action: 'upload', from: metadata.path, to: target });
            if (!dryRun) {
              const uploaded = await this.storage.uploadLocalAsset(asset.id, target, asset.mime);
              metadata = { path: target, exists: true, size: asset.size, etag: uploaded.remoteEtag || undefined };
            }
          } else actions.push({ assetId: asset.id, action: 'verified', to: target });
          if (!dryRun) await this.prisma.asset.update({ where: { id: asset.id }, data: {
            clientId, remotePath: target, remoteEtag: metadata.etag || asset.remoteEtag,
            storageState: 'synced', storageError: null, lastVerifiedAt: timestamp,
          } });
          continue;
        }

        if (await this.storage.hasLocalAsset(asset.id)) {
          actions.push({ assetId: asset.id, action: 'upload', from: asset.remotePath, to: target });
          if (!dryRun) {
            const uploaded = await this.storage.uploadLocalAsset(asset.id, target, asset.mime);
            await this.prisma.asset.update({ where: { id: asset.id }, data: {
              clientId, remotePath: uploaded.remotePath, remoteEtag: uploaded.remoteEtag,
              storageState: 'synced', storageError: null, lastVerifiedAt: timestamp,
            } });
          }
        } else {
          actions.push({ assetId: asset.id, action: 'missing', from: asset.remotePath, to: target });
          if (!dryRun) await this.prisma.asset.update({ where: { id: asset.id }, data: {
            clientId, storageState: 'missing', storageError: 'Arquivo ausente no Nextcloud e na cópia local.', lastVerifiedAt: timestamp,
          } });
        }
      } catch (error) {
        const message = this.message(error);
        actions.push({ assetId: asset.id, action: 'error', from: asset.remotePath, to: target, error: message });
        if (!dryRun) await this.prisma.asset.update({ where: { id: asset.id }, data: { clientId, storageState: 'error', storageError: message, lastVerifiedAt: timestamp } });
      }
    }

    const summary = {
      dryRun, source: options.source || 'api', durationMs: Date.now() - startedAt,
      bindings: bindingResult.summary,
      assets: Object.fromEntries(['verified', 'upload', 'move', 'missing', 'error'].map((action) => [action, actions.filter((item) => item.action === action).length])),
      actions,
    };
    if (!dryRun) await this.prisma.audit.create({ data: { at: now(), action: 'nextcloud_reconcile', target: 'storage', details: summary as any } });
    console.log(JSON.stringify({ level: 'info', event: 'nextcloud_reconcile', ...summary, actions: undefined }));
    return summary;
  }

  private async reconcileBindings(dryRun: boolean) {
    const [entries, clients, existing] = await Promise.all([
      this.storage.listDirectoryEntries(),
      this.prisma.document.findMany({ where: { collection: 'clients' }, select: { id: true, data: true } }),
      this.prisma.clientStorageBinding.findMany(),
    ]);
    const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
    const entriesByName = new Map(entries.map((entry) => [normalizeFolderName(entry.name), entry]));
    const existingByClient = new Map(existing.map((binding) => [binding.clientId, binding]));
    const usedPaths = new Set(existing.map((binding) => binding.folderPath));
    const result: any[] = [];
    let verified = 0, created = 0, missing = 0, unmatched = 0;
    const unmatchedClients: Array<{ clientId: string; clientName: string }> = [];
    const missingFolders: Array<{ clientId: string; clientName: string; folderPath: string }> = [];

    for (const client of clients) {
      const stored = existingByClient.get(client.id);
      if (stored) {
        const entry = entriesByPath.get(stored.folderPath);
        const timestamp = now();
        if (entry) {
          verified++;
          const binding = { ...stored, folderName: entry.name, status: 'active', lastVerifiedAt: timestamp, lastError: null };
          result.push(binding);
          if (!dryRun) await this.prisma.clientStorageBinding.update({ where: { clientId: client.id }, data: { folderName: entry.name, status: 'active', lastVerifiedAt: timestamp, lastError: null, updatedAt: timestamp } });
        } else {
          missing++;
          missingFolders.push({ clientId: client.id, clientName: String((client.data as any)?.name || client.id), folderPath: stored.folderPath });
          const binding = { ...stored, status: 'missing', lastVerifiedAt: timestamp, lastError: 'Pasta não encontrada no Nextcloud.' };
          result.push(binding);
          if (!dryRun) await this.prisma.clientStorageBinding.update({ where: { clientId: client.id }, data: { status: 'missing', lastVerifiedAt: timestamp, lastError: binding.lastError, updatedAt: timestamp } });
        }
        continue;
      }

      const name = String((client.data as any)?.name || '');
      const normalized = normalizeFolderName(name);
      const entry = entriesByName.get(aliases[normalized] || normalized);
      if (!entry || usedPaths.has(entry.path)) {
        unmatched++;
        unmatchedClients.push({ clientId: client.id, clientName: name });
        continue;
      }
      created++;
      usedPaths.add(entry.path);
      const timestamp = now();
      const binding = { clientId: client.id, folderName: entry.name, folderPath: entry.path, status: 'active', createdAt: timestamp, updatedAt: timestamp, lastVerifiedAt: timestamp, lastError: null };
      result.push(binding);
      if (!dryRun) await this.prisma.clientStorageBinding.create({ data: binding });
    }
    return { bindings: result, summary: { verified, created, missing, unmatched, total: clients.length, unmatchedClients, missingFolders } };
  }

  private inferAssetClients(assetIds: string[], documents: Array<{ collection: string; id: string; data: unknown }>) {
    const known = new Set(assetIds);
    const matches = new Map<string, Set<string>>();
    const add = (assetId: string, clientId: string) => {
      if (!known.has(assetId) || !clientId) return;
      if (!matches.has(assetId)) matches.set(assetId, new Set());
      matches.get(assetId)!.add(clientId);
    };
    const visit = (value: unknown, clientId: string, depth = 0) => {
      if (depth > 32 || value == null) return;
      if (typeof value === 'string') {
        if (known.has(value)) add(value, clientId);
        const blob = value.match(/\/_blob\/([A-Za-z0-9_-]{16,128})(?:$|[?#])/);
        if (blob) add(blob[1], clientId);
      } else if (Array.isArray(value)) value.forEach((item) => visit(item, clientId, depth + 1));
      else if (typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((item) => visit(item, clientId, depth + 1));
    };
    for (const row of documents) {
      const data = row.data as any;
      const clientId = row.collection === 'clients' ? row.id : String(data?.clientId || data?.client || '');
      if (clientId) visit(data, clientId);
    }
    return new Map([...matches].flatMap(([assetId, clients]) => clients.size === 1 ? [[assetId, [...clients][0]]] : []));
  }

  private message(error: unknown) { return String((error as any)?.message || error || 'Falha desconhecida.').slice(0, 500); }
}
