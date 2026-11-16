import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Response } from 'express';
import { User } from '@terzo/database';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';
import { config, now } from './config';

type Client = { response: Response; user: User; hash: string };

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly clients = new Set<Client>();
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly access: AccessService) {
    this.timer = setInterval(() => void this.keepAlive(), 25_000);
    this.timer.unref();
  }

  add(client: Client) { this.clients.add(client); }
  remove(client: Client) { this.clients.delete(client); }
  broadcast(collection: string, id: string, data: unknown) {
    const message = `event: doc\ndata: ${JSON.stringify({ coll: collection, id, data })}\n\n`;
    for (const client of this.clients) if (this.access.can(client.user, `${collection}/${id}`, 'read')) client.response.write(message);
  }
  kick(userId: string) {
    for (const client of this.clients) if (client.user.id === userId) {
      client.response.write('event: logout\ndata: {}\n\n'); client.response.end(); this.clients.delete(client);
    }
  }
  onModuleDestroy() { clearInterval(this.timer); }

  private async keepAlive() {
    for (const client of this.clients) {
      const session = await this.prisma.session.findUnique({ where: { idHash: client.hash }, include: { user: true } });
      const profile = session?.user.role === 'member' && session.user.memberId
        ? await this.prisma.document.findUnique({ where: { collection_id: { collection: 'members', id: session.user.memberId } } })
        : null;
      const memberData = profile?.data as any;
      const memberDisabled = !!(session?.user.role === 'member' && session.user.memberId &&
        (!memberData || memberData.disabled || memberData.accountId !== session.user.id));
      if (memberDisabled || !session || session.user.status !== 'active' || session.ver !== session.user.sessionVersion || now() > session.expiresAt || now() - session.lastSeen > BigInt(config.idleHours * 3_600_000) || session.user.mustChange) {
        client.response.write('event: logout\ndata: {}\n\n'); client.response.end(); this.clients.delete(client);
      } else { client.user = session.user; client.response.write(': ping\n\n'); }
    }
  }
}
