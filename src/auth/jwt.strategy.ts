import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { Repository } from "typeorm";
import { User } from "src/user/user.entity";

export interface JwtPayload {
  user_id: number;
  email: string;
  /** The user's token_version at login; missing on tokens issued before it existed. */
  tv?: number;
  iat?: number;
  exp?: number;
}

/**
 * True while the token's user exists and hasn't changed their password since
 * the token was issued. Tokens without `tv` count as version 0, the default.
 */
export const isTokenCurrent = async (
  users: Repository<User>,
  payload: JwtPayload,
): Promise<boolean> => {
  const user = await users.findOne({
    select: { id: true, token_version: true },
    where: { id: payload.user_id },
  });
  return !!user && user.token_version === (payload.tv ?? 0);
};

export const cookieName = "chronicle_access_token";

/** Reads JWT_SECRET and refuses to run without it, instead of falling back to a guessable default. */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return secret;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (!req?.cookies) return null;
          const cookies = req.cookies as Record<string, string>;
          return cookies[cookieName] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload || !(await isTokenCurrent(this.users, payload))) {
      throw new UnauthorizedException("Invalid or missing token");
    }
    return payload;
  }
}
