import type { Repository } from "typeorm";
import { PostService } from "./post.service";
import type { Post } from "./post.entity";
import type { User } from "src/user/user.entity";
import type { NotificationGateway } from "src/notifications/notification.gateway";
import type { NotificationService } from "src/notifications/notification.service";
import type { NotificationSettingsService } from "src/notifications/notification-settings.service";

const author = { id: 1, followers: [2] } as unknown as User;

const setup = (stored: Partial<Post>) => {
  const repo = {
    findOneBy: jest.fn().mockResolvedValue({ ...stored }),
    findOneByOrFail: jest.fn().mockResolvedValue({ ...stored }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn().mockImplementation((p: Post) => Promise.resolve(p)),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const userRepo = { findOne: jest.fn().mockResolvedValue(author) };
  const settings = {
    getUserSettingsBulk: jest.fn().mockResolvedValue([
      {
        user_id: 2,
        notify_followed_posts_enabled: true,
        notify_followed_posts_from_users: [],
      },
    ]),
  };
  const notifications = {
    findRecentNotificationsForUserBulk: jest.fn().mockResolvedValue([]),
    createNotificationBulk: jest.fn().mockResolvedValue([{ id: 9 }]),
  };
  const gateway = { sendNotificationToUserBulk: jest.fn() };
  const service = new PostService(
    repo as unknown as Repository<Post>,
    userRepo as unknown as Repository<User>,
    gateway as unknown as NotificationGateway,
    notifications as unknown as NotificationService,
    settings as unknown as NotificationSettingsService,
  );
  return { service, repo, notifications };
};

// Notifications are sent in the background; let those promises settle.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("PostService", () => {
  it("notifies followers when an update publishes a draft", async () => {
    const { service, notifications } = setup({
      id: 5,
      user_id: 1,
      is_draft: true,
    });
    await service.update({ id: 5, user_id: 1, is_draft: false });
    await flush();
    expect(notifications.createNotificationBulk).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: 2, post_id: 5 }),
    ]);
  });

  it("doesn't notify followers when an autosave keeps the draft", async () => {
    const { service, notifications } = setup({
      id: 5,
      user_id: 1,
      is_draft: true,
    });
    await service.update({ id: 5, user_id: 1, is_draft: true, content: "x" });
    await flush();
    expect(notifications.createNotificationBulk).not.toHaveBeenCalled();
  });

  it("notifies followers when a draft is published", async () => {
    const { service, notifications } = setup({
      id: 5,
      user_id: 1,
      is_draft: true,
    });
    await service.publishDraft(5, 1);
    await flush();
    expect(notifications.createNotificationBulk).toHaveBeenCalled();
  });

  it("doesn't count a writer's view of their own post", async () => {
    const { service, repo } = setup({ id: 5, user_id: 1, view_count: 3 });
    await service.incrementPostCount(5, "view", 1);
    expect(repo.increment).not.toHaveBeenCalled();
  });

  it("counts views from other readers and anonymous visitors", async () => {
    const { service, repo } = setup({ id: 5, user_id: 1, view_count: 3 });
    await service.incrementPostCount(5, "view", 2);
    await service.incrementPostCount(5, "view");
    expect(repo.increment).toHaveBeenCalledTimes(2);
  });
});
