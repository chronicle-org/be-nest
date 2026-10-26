import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { User } from "../user/user.entity";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "./jwt.strategy";
import { generateHandle } from "src/utils";
import { PG_ERROR } from "src/utils/constant";
import { NotificationSettings } from "../notifications/notification-settings.entity";
import { baseDefaultSettingsValues } from "src/notifications/notification-settings.service";
import { removeFromAllJsonbArrays } from "src/utils/jsonb-array";

// bcrypt hash of a random string, compared against when the email is unknown.
const DUMMY_HASH =
  "$2b$10$K3ng5iSBR9S2ruSaaiLRZuwzuKXVUyh75oi9zUpX7zdsDT2DUyvw2";

export type TRegisterData = {
  name: string;
  email: string;
  password: string;
};

/** True when a save failed because `column` already holds that value. */
const isUniqueViolation = (error: unknown, column: string): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  // TypeORM keeps the original pg error, which has the SQLSTATE code and a
  // detail like "Key (email)=(a@x.com) already exists."
  const { code, detail } = error.driverError as {
    code?: string;
    detail?: string;
  };
  return (
    code === PG_ERROR.UNIQUE_VIOLATION && !!detail?.includes(`(${column})`)
  );
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(NotificationSettings)
    private notificationSettingsRepo: Repository<NotificationSettings>,
    private jwtService: JwtService,
  ) {}

  async register(data: TRegisterData): Promise<Partial<User>> {
    try {
      const saltRounds = 10;
      if (!data.password)
        throw new InternalServerErrorException("Password is required");
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);
      const now = new Date();
      // Handles are name + minute, so two people with the same name signing
      // up in the same minute would collide; add a random suffix if taken.
      let handle = generateHandle(data.name);
      if (await this.repo.existsBy({ handle }))
        handle = `${handle}${randomInt(1000, 10000)}`;
      const userData: Partial<User> = {
        name: data.name,
        email: data.email,
        password_hash: hashedPassword,
        created_at: now,
        handle,
      };
      const user = this.repo.create(userData);
      const savedUser = await this.repo.save(user);
      const { password_hash: _, ...rest } = savedUser;

      void (async () => {
        try {
          const defaultSettings = this.notificationSettingsRepo.create({
            ...baseDefaultSettingsValues,
            notify_followed_posts_from_users: [],
            user_id: savedUser.id,
            created_at: now,
            user: savedUser,
          });
          await this.notificationSettingsRepo.upsert(defaultSettings, {
            conflictPaths: ["user_id"],
          });
        } catch (error) {
          console.warn(
            "Failed to create notification settings for user",
            savedUser.id,
            error,
          );
        }
      })();

      return rest;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      if (isUniqueViolation(error, "email"))
        throw new ConflictException("Email is already registered");
      throw new InternalServerErrorException("Failed to create user");
    }
  }

  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<User & { access_token: string }> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
      .addSelect("user.email")
      .addSelect("user.token_version")
      .where({ email })
      .getOne();

    // Same error and similar timing for unknown emails and wrong passwords,
    // so login can't be used to check which emails are registered.
    const passwordValid = await bcrypt.compare(
      password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !passwordValid)
      throw new UnauthorizedException("Invalid credentials");

    const { password_hash: _, token_version, ...profile } = user;
    const token = this.signToken(user.id, user.email, token_version);

    return { ...profile, access_token: token } as User & {
      access_token: string;
    };
  }

  async changePassword(
    user_id: number,
    current_password: string,
    new_password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
      .addSelect("user.email")
      .addSelect("user.token_version")
      .where({ id: user_id })
      .getOne();
    if (!user) throw new UnauthorizedException();

    // 400 rather than 401, so the web app doesn't treat it as a logged-out session.
    if (!(await bcrypt.compare(current_password, user.password_hash)))
      throw new BadRequestException("Current password is incorrect");
    if (current_password === new_password)
      throw new BadRequestException(
        "New password must be different from the current one",
      );

    // A new token version logs out every other device; this one gets a fresh token.
    const token_version = user.token_version + 1;
    await this.repo.update(
      { id: user_id },
      { password_hash: await bcrypt.hash(new_password, 10), token_version },
    );
    return {
      access_token: this.signToken(user.id, user.email, token_version),
    };
  }

  /**
   * Deletes the account with its posts, comments and notifications, and takes
   * it out of other people's follower lists and posts' likes and bookmarks.
   */
  async deleteAccount(user_id: number, password: string): Promise<void> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
      .where({ id: user_id })
      .getOne();
    if (!user) throw new UnauthorizedException();
    // 400 rather than 401, so the web app doesn't treat it as a logged-out session.
    if (!(await bcrypt.compare(password, user.password_hash)))
      throw new BadRequestException("Password is incorrect");

    await this.repo.manager.transaction(async (manager) => {
      const ownPosts: { id: number }[] = await manager.query(
        `SELECT id FROM "post" WHERE user_id = $1`,
        [user_id],
      );
      const postIds = ownPosts.map((post) => post.id);

      // Comments on other people's posts; the ones on the user's own posts go with them.
      await manager.query(
        `UPDATE "post" p
         SET comment_count = GREATEST(p.comment_count - c.n, 0)
         FROM (SELECT post_id, COUNT(*)::int AS n FROM "comment"
               WHERE user_id = $1 GROUP BY post_id) c
         WHERE p.id = c.post_id`,
        [user_id],
      );
      await manager.query(`DELETE FROM "comment" WHERE user_id = $1`, [
        user_id,
      ]);
      await manager.query(
        `DELETE FROM "notification" WHERE actor_id = $1 OR recipient_id = $1`,
        [user_id],
      );

      for (const [column, countColumn] of [
        ["following", "following_count"],
        ["followers", "followers_count"],
      ])
        await removeFromAllJsonbArrays(
          manager,
          { table: "user", column, countColumn },
          [user_id],
        );
      for (const [column, countColumn] of [
        ["likes", "likes_count"],
        ["bookmarks", "bookmarks_count"],
      ]) {
        await removeFromAllJsonbArrays(
          manager,
          { table: "post", column, countColumn },
          [user_id],
        );
        await removeFromAllJsonbArrays(
          manager,
          { table: "user", column, countColumn },
          postIds,
        );
      }

      await manager.query(`DELETE FROM "post" WHERE user_id = $1`, [user_id]);
      await manager.query(
        `DELETE FROM "notification_settings" WHERE user_id = $1`,
        [user_id],
      );
      await manager.query(`DELETE FROM "user" WHERE id = $1`, [user_id]);
    });
  }

  private signToken(user_id: number, email: string, tv: number): string {
    const payload: JwtPayload = { user_id, email, tv };
    return this.jwtService.sign(payload);
  }
}
