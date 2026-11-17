import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { AdminController } from './admin.controller';
import { AppController } from './app.controller';
import { AssetsController } from './assets.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DocumentsController } from './documents.controller';
import { EventsService } from './events.service';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { AssetAccessService } from './asset-access.service';
import { StorageController } from './storage.controller';
import { ProfilePhotoController } from './profile-photo.controller';
import { NextcloudReconciliationService } from './nextcloud-reconciliation.service';
import { ClientApprovalService } from './client-approval.service';
import { ClientApprovalController } from './client-approval.controller';

@Module({
  controllers: [AppController, AuthController, DocumentsController, AssetsController, AdminController, StorageController, ClientApprovalController, ProfilePhotoController],
  providers: [PrismaService, AuthService, AccessService, EventsService, StorageService, AssetAccessService, NextcloudReconciliationService, ClientApprovalService],
})
export class AppModule {}
