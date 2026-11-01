import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/user/user.entity";
import type { JwtPayload } from "./jwt.strategy";

/**
 * When REQUIRE_VERIFIED_EMAIL=true, only users who verified their email can
 * get past this guard. Use it after JwtAuthGuard, on routes that publish
 * something (posts, comments). Off by default.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.REQUIRE_VERIFIED_EMAIL !== "true") return true;
    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user) return false;
    const verified = await this.users.existsBy({
      id: user.user_id,
      email_verified: true,
    });
    if (!verified)
      throw new ForbiddenException(
        "Verify your email first. Check your inbox for the link.",
      );
    return true;
  }
}
