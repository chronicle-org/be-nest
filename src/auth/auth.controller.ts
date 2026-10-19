import {
  Controller,
  Post,
  Body,
  Res,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { User } from "../user/user.entity";
import type { Response } from "express";
import { cookieName } from "./jwt.strategy";
import { Throttle } from "@nestjs/throttler";
import { RATE_LIMIT } from "src/utils/constant";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({ summary: "User login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful. Token set in cookie.",
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Throttle({ default: RATE_LIMIT.AUTH.LOGIN })
  @Post("/login")
  async login(
    @Body() data: LoginDto,
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

  @ApiOperation({ summary: "Register a new user account" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 403, description: "Sign up is closed" })
  @ApiResponse({ status: 409, description: "Email is already registered" })
  @Throttle({ default: RATE_LIMIT.AUTH.REGISTER })
  @Post("/register")
  register(@Body() data: RegisterDto): Promise<Partial<User> | null | string> {
    // Sign up stays open unless SIGNUP_ENABLED is explicitly "false".
    if (process.env.SIGNUP_ENABLED === "false")
      throw new ForbiddenException("Sign up is closed");
    return this.service.register(data);
  }

  @ApiOperation({ summary: "Logout user by clearing authentication cookie" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(cookieName);
    return { message: "Logged out" };
  }
}
