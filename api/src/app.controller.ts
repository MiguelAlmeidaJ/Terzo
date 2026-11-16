import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Get('healthz')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    const storage = this.storage.status();
    return { ok: true, storage: { enabled: storage.enabled, state: storage.state } };
  }
}
