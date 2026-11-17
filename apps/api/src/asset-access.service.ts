import { Injectable } from '@nestjs/common';
import { Asset, User } from '@terzo/database';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

/** Asset IDs are opaque identifiers, not permissions to view their contents. */
@Injectable()
export class AssetAccessService {
  constructor(private readonly prisma: PrismaService, private readonly access: AccessService) {}

  async canRead(user: User, asset: Asset): Promise<boolean> {
    if (asset.owner === user.id || this.access.level(user) >= 3) return true;
    if (!user.memberId) return false;

    // Prefilter by the opaque asset ID, then verify an exact reference and ACL.
    const rows = await this.prisma.$queryRaw<Array<{ coll: string; id: string; data: unknown }>>`
      SELECT coll, id, data FROM docs WHERE data::text LIKE ${'%' + asset.id + '%'}
    `;
    return rows.some((row) =>
      this.access.can(user, `${row.coll}/${row.id}`, 'read') && this.referencesAsset(row.data, asset.id)
    );
  }

  private referencesAsset(value: unknown, id: string, depth = 0): boolean {
    if (depth > 32 || value == null) return false;
    if (typeof value === 'string')
      return value === id || value === `/_blob/${id}` || value.endsWith(`/_blob/${id}`);
    if (Array.isArray(value)) return value.some((item) => this.referencesAsset(item, id, depth + 1));
    if (typeof value === 'object')
      return Object.values(value as Record<string, unknown>).some((item) => this.referencesAsset(item, id, depth + 1));
    return false;
  }
}
