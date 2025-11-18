import { Controller, Post, Body, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { TRegisterData } from "./auth.service";
import { User } from "../user/user.entity";
import type { Response } from "express";
import { cookieName } from "./jwt.strategy";

@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post("/login")
  async login(
    @Body()
    data: {
      email: string;
      password: string;
    },
    @Res({ passthrough: true }) res: Response,
  ): Promise<User | null | string> {
    const userData = await this.service.login(data);

    res.cookie(cookieName, userData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return userData;
  }

  @Post("/register")
  register(
    @Body()
    data: TRegisterData,
  ): Promise<Partial<User> | null | string> {
    return this.service.register(data);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(cookieName);
    return { message: "Logged out" };
  }
}
