import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Notification, NotificationType } from "./notification.entity";
import { Between, In, Repository } from "typeorm";
import { InsertNotificationDto } from "./dto/notifications.dto";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  async getUserNotifications(userId: number, limit = 20, page = 1) {
    const offset = (page - 1) * limit;
    return this.repo.find({
      where: { recipient_id: userId, deleted: false },
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  async findRecentNotificationsForUser(
    userId: number,
    actorId: number,
    type: NotificationType,
    windowMinutes = 5,
  ) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000); // spam window
    const existing = await this.repo.findOne({
      where: {
        recipient_id: userId,
        actor_id: actorId,
        type: type,
        created_at: Between(since, new Date()),
      },
      order: { created_at: "DESC" },
    });
    return existing;
  }

  async createNotification(payload: InsertNotificationDto) {
    const data = {
      recipient_id: payload.recipient_id,
      actor_id: payload.actor_id,
      type: payload.type,
      post_id: payload.post_id,
      comment_id: payload.comment_id,
      message: payload.message,
    };
    const notification = this.repo.create(data);
    return this.repo.save(notification);
  }

  async deleteNotification(notificationId: number, userId: number) {
    return this.repo.update(
      { id: notificationId, recipient_id: userId },
      { deleted: true, deleted_at: new Date() },
    );
  }

  async markAsRead(notificationId: number, userId: number) {
    return this.repo.update(
      { id: notificationId, recipient_id: userId },
      { read: true, read_at: new Date() },
    );
  }

  async markMultipleAsRead(notificationIds: number[], userId: number) {
    return this.repo.update(
      { id: In(notificationIds), recipient_id: userId },
      { read: true, read_at: new Date() },
    );
  }
}
