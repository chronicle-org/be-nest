import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NotificationGateway } from "./notification.gateway";
import { Notification } from "./notification.entity";
import { NotificationSettings } from "./notification-settings.entity";
import { User } from "src/user/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationService } from "./notification.service";
import { NotificationSettingsService } from "./notification-settings.service";
import { NotificationController } from "./notification.controller";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Notification, NotificationSettings, User]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    NotificationService,
    NotificationSettingsService,
  ],
  exports: [
    NotificationService,
    NotificationSettingsService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
