import {
  Controller,
  Post,
  Body,
  Res,
  ForbiddenException,
  Put,
  Delete,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/password-reset.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "./jwt.strategy";
import { User } from "../user/user.entity";
import type { Response } from "express";
import { cookieName } from "./jwt.strategy";
import { Throttle } from "@nestjs/throttler";
import { RATE_LIMIT } from "src/utils/constant";

const setAuthCookie = (res: Response, token: string) =>
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

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
    setAuthCookie(res, userData.access_token);
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

  @ApiOperation({ summary: "Change the current user's password" })
  @ApiResponse({
    status: 200,
    description:
      "Password changed. Other sessions are logged out; this one gets a new cookie.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input, or the current password is incorrect",
  })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: RATE_LIMIT.AUTH.CHANGE_PASSWORD })
  @Put("/password")
  async changePassword(
    @Body() data: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const { access_token } = await this.service.changePassword(
      user.user_id,
      data.current_password,
      data.new_password,
    );
    // Other devices are now logged out; keep this one logged in.
    setAuthCookie(res, access_token);
    return { message: "Password changed" };
  }

  @ApiOperation({
    summary: "Delete the current user's account",
    description:
      "Deletes the account with its posts, comments and notifications, and logs out. Needs the current password.",
  })
  @ApiResponse({ status: 200, description: "Account deleted" })
  @ApiResponse({ status: 400, description: "The password is incorrect" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: RATE_LIMIT.AUTH.DELETE_ACCOUNT })
  @Delete("/account")
  async deleteAccount(
    @Body() data: DeleteAccountDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.service.deleteAccount(user.user_id, data.password);
    res.clearCookie(cookieName);
    return { message: "Account deleted" };
  }

  @ApiOperation({
    summary: "Email a password reset link",
    description:
      "Always answers the same way whether or not the email has an account. The link is valid for 30 minutes.",
  })
  @ApiResponse({ status: 200, description: "Request accepted" })
  @ApiResponse({
    status: 503,
    description: "Email sending isn't configured on this server",
  })
  @Throttle({ default: RATE_LIMIT.AUTH.FORGOT_PASSWORD })
  @HttpCode(200)
  @Post("/forgot-password")
  forgotPassword(@Body() data: ForgotPasswordDto): { message: string } {
    this.service.requestPasswordReset(data.email);
    return {
      message: "If that email has an account, a reset link is on its way",
    };
  }

  @ApiOperation({
    summary: "Set a new password from a reset link",
    description: "Logs out every device; sign in with the new password.",
  })
  @ApiResponse({ status: 200, description: "Password reset" })
  @ApiResponse({
    status: 400,
    description: "The link is invalid, expired or already used",
  })
  @Throttle({ default: RATE_LIMIT.AUTH.RESET_PASSWORD })
  @HttpCode(200)
  @Post("/reset-password")
  async resetPassword(
    @Body() data: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.service.resetPassword(data.token, data.new_password);
    return { message: "Password reset" };
  }

  @ApiOperation({ summary: "Logout user by clearing authentication cookie" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(cookieName);
    return { message: "Logged out" };
  }
}
