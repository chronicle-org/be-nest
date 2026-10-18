import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";

export interface JwtPayload {
  user_id: number;
  email: string;
  iat?: number;
  exp?: number;
}

export const cookieName = "chronicle_access_token";

/** Reads JWT_SECRET and refuses to run without it, instead of falling back to a guessable default. */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return secret;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

  validate(payload: JwtPayload): JwtPayload {
    if (!payload) {
      throw new UnauthorizedException("Invalid or missing token");
    }
    return payload;
  }
}
