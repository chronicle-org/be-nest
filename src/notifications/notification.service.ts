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
        deleted: false,
        created_at: Between(since, new Date()),
      },
      order: { created_at: "DESC" },
    });
    return existing;
  }

  async findRecentNotificationsForUserBulk(
    userIds: number[],
    actorId: number,
    type: NotificationType,
    windowMinutes = 5,
  ) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000); // spam window
    const existing = await this.repo.find({
      where: {
        recipient_id: In(userIds),
        actor_id: actorId,
        type: type,
        deleted: false,
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

  async createNotificationBulk(payload: InsertNotificationDto[]) {
    try {
      await this.repo.insert(payload);
    } catch (error) {
      console.error("Error inserting notifications in bulk", error);
      throw error;
    }

    const notifications = await this.repo
      .createQueryBuilder()
      .select()
      .where({ recipient_id: In(payload.map((p) => p.recipient_id)) })
      .andWhere({ actor_id: payload[0].actor_id })
      .andWhere({ type: payload[0].type })
      .andWhere({ deleted: false })
      .andWhere("created_at BETWEEN :since AND :now", {
        since: new Date(Date.now() - 10 * 60 * 1000),
        now: new Date(),
      })
      .orderBy("created_at", "DESC")
      .getMany();

    // Deduplicate by recipient_id, keeping the most recent (first due to DESC order)
    const dedupedMap = new Map<number, Notification>();
    for (const notification of notifications) {
      if (!dedupedMap.has(notification.recipient_id)) {
        dedupedMap.set(notification.recipient_id, notification);
      }
    }
    return Array.from(dedupedMap.values());
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
