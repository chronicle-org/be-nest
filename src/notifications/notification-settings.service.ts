import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationSettings } from "./notification-settings.entity";
import { In, Repository } from "typeorm";
import { UpdateNotificationSettingsDto } from "./dto/notifications.dto";

export const baseDefaultSettingsValues = {
  notify_comments: true,
  notify_likes: true,
  notify_follows: true,
  notify_bookmarks: true,
  notify_replies: true,
  notify_followed_posts_enabled: true,
};
@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private repo: Repository<NotificationSettings>,
  ) {}

  async getUserSettings(userId: number) {
    let settings = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = this.repo.create({
        ...baseDefaultSettingsValues,
        notify_followed_posts_from_users: [],
        user_id: userId,
        created_at: new Date(),
      });
      await this.repo.save(settings);
    }

    return settings;
  }

  async getUserSettingsBulk(userIds: number[]) {
    const uniqueUserIds = Array.from(new Set(userIds));
    let settings = await this.repo.find({
      where: { user_id: In(uniqueUserIds) },
    });

    const foundUserIds = new Set(settings.map((s) => s.user_id));
    const missingUserIds = uniqueUserIds.filter((id) => !foundUserIds.has(id));

    if (missingUserIds.length > 0) {
      try {
        await this.repo.insert(
          missingUserIds.map((userId) => ({
            ...baseDefaultSettingsValues,
            notify_followed_posts_from_users: [],
            user_id: userId,
            created_at: new Date(),
          })),
        );
      } catch (error) {
        console.warn("Failed to insert missing notification settings", error);
      }
      const newlyInserted = await this.repo.find({
        where: { user_id: In(missingUserIds) },
      });
      settings = settings.concat(newlyInserted);
    }

    return settings;
  }

  async updateSettings(userId: number, payload: UpdateNotificationSettingsDto) {
    const settings = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      const newSettings = this.repo.create({
        ...baseDefaultSettingsValues,
        notify_followed_posts_from_users: [],
        user_id: userId,
        created_at: new Date(),
        ...payload,
      });
      return this.repo.save(newSettings);
    }

    Object.assign(settings, payload);
    return this.repo.save(settings);
  }
}
