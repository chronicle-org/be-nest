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
    const [data, total] = await this.repo.findAndCount({
      where: { recipient_id: userId, deleted: false },
      relations: ["actor", "post", "comment"],
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    });
    return { data, total };
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
    let notifications: Notification[];
    try {
      if (payload.length === 0) throw new Error("Payload array is empty");
      const insertResult = await this.repo
        .createQueryBuilder()
        .insert()
        .values(payload)
        .returning("*")
        .execute();

      // In Postgres, `raw` contains the rows returned by `RETURNING *`
      notifications = insertResult.raw as Notification[];
    } catch (error) {
      console.error("Error inserting notifications in bulk", error);
      throw error;
    }

    return notifications;
  }

  async deleteNotification(notificationId: number, userId: number) {
    return this.repo.update(
      { id: notificationId, recipient_id: userId },
      { deleted: true, deleted_at: new Date() },
    );
  }

  async markAsRead(notificationId: number, userId: number) {
    await this.repo.update(
      { id: notificationId, recipient_id: userId },
      { read: true, read_at: new Date() },
    );
    const newData = await this.repo.findBy({ id: notificationId });
    return newData[0];
  }

  async markMultipleAsRead(notificationIds: number[], userId: number) {
    await this.repo.update(
      { id: In(notificationIds), recipient_id: userId },
      { read: true, read_at: new Date() },
    );
    const newData = await this.repo.findBy({ id: In(notificationIds) });
    return newData;
  }
}
