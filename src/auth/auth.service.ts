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

    delete (user as Partial<User>).password_hash;

    const tokenPayload: JwtPayload = {
      user_id: user.id,
      email: user.email,
    };
    const token = this.jwtService.sign(tokenPayload);

    return { ...user, access_token: token };
  }

  async changePassword(
    user_id: number,
    current_password: string,
    new_password: string,
  ): Promise<{ message: string }> {
    const user = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.password_hash")
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

    await this.repo.update(
      { id: user_id },
      { password_hash: await bcrypt.hash(new_password, 10) },
    );
    return { message: "Password changed" };
  }
}
