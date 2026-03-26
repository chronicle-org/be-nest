import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/user.entity";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "./jwt.strategy";
import { generateHandle } from "src/utils";
import { NotificationSettings } from "../notifications/notification-settings.entity";

export type TRegisterData = {
  name: string;
  email: string;
  password: string;
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
      const userData: Partial<User> = {
        name: data.name,
        email: data.email,
        password_hash: hashedPassword,
        created_at: now,
        handle: generateHandle(data.name),
      };
      const user = this.repo.create(userData);
      const savedUser = await this.repo.save(user);
      const { password_hash: _, ...rest } = savedUser;

      const defaultSettings = this.notificationSettingsRepo.create({
        notify_bookmarks: true,
        notify_comments: true,
        notify_follows: true,
        notify_likes: true,
        notify_replies: true,
        notify_followed_posts_enabled: true,
        user_id: savedUser.id,
        created_at: now,
        user: savedUser,
      });
      await this.notificationSettingsRepo.save(defaultSettings);

      return rest;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
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
      .where({ email })
      .getOne();

    if (!user) throw new NotFoundException("User not found");

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) throw new UnauthorizedException("Invalid credentials");

    delete (user as Partial<User>).password_hash;

    const tokenPayload: JwtPayload = {
      user_id: user.id,
      email: user.email,
    };
    const token = this.jwtService.sign(tokenPayload);

    return { ...user, access_token: token };
  }
}
