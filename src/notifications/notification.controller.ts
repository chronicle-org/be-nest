import {
  Body,
  Controller,
  Delete,
  // ForbiddenException,
  Param,
  ParseIntPipe,
  // Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Get } from "@nestjs/common";
import {
  GetAllNotificationsForUserDto,
  // InsertNotificationDto,
  UpdateNotificationSettingsDto,
} from "./dto/notifications.dto";
import { NotificationService } from "./notification.service";
import { NotificationSettingsService } from "./notification-settings.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import type { JwtPayload } from "src/auth/jwt.strategy";
import { CurrentUser } from "src/utils/decorator";

@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationSettingService: NotificationSettingsService,
  ) {}

  @Get("/")
  @UseGuards(JwtAuthGuard)
  async getNotificationsForUser(
    @Query() queryDto: GetAllNotificationsForUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const { limit = 20, page = 1 } = queryDto;
    return await this.notificationService.getUserNotifications(
      user.user_id,
      limit,
      page,
    );
  }

  // DISABLED FOR NOW
  // @Post("/")
  // @UseGuards(JwtAuthGuard)
  // insertNewNotification(
  //   @Body() data: InsertNotificationDto,
  //   @CurrentUser() user: JwtPayload,
  // ) {
  //   if (data.actor_id !== user.user_id) {
  //     throw new ForbiddenException(
  //       "Cannot create notifications as another user",
  //     );
  //   }
  //   // Client cannot initiate notifications - server-side only
  //   throw new ForbiddenException(
  //     "Client-initiated notifications are not allowed. Notifications are created server-side only.",
  //   );
  // }

  @Delete("/:id")
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.notificationService.deleteNotification(id, user.user_id);
  }

  @Put("/read")
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Body("ids") ids: number[],
    @CurrentUser() user: JwtPayload,
  ) {
    if (ids.length === 0) {
      return { data: undefined, message: "No notifications to mark as read" };
    } else if (ids.length === 1) {
      return await this.notificationService.markAsRead(ids[0], user.user_id);
    }
    return await this.notificationService.markMultipleAsRead(ids, user.user_id);
  }

  @Get("/settings")
  @UseGuards(JwtAuthGuard)
  async getNotificationSettings(@CurrentUser() user: JwtPayload) {
    return await this.notificationSettingService.getUserSettings(user.user_id);
  }

  @Put("/settings")
  @UseGuards(JwtAuthGuard)
  async updateNotificationSettings(
    @CurrentUser() user: JwtPayload,
    @Body() payload: UpdateNotificationSettingsDto,
  ) {
    return await this.notificationSettingService.updateSettings(
      user.user_id,
      payload,
    );
  }
}
