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
      secretOrKey: process.env.JWT_SECRET || "secret",
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload) {
      throw new UnauthorizedException("Invalid or missing token");
    }
    return payload;
  }
}
