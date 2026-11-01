import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "john@example.com",
    description: "Email of the account to reset",
  })
  @IsEmail({}, { message: "Enter a valid email" })
  @MaxLength(50)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "The token from the reset link" })
  @IsString()
  @MinLength(1, { message: "Reset token is required" })
  token: string;

  @ApiProperty({
    example: "newPassword456",
    description: "New password (6-255 characters)",
  })
  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters" })
  @MaxLength(255, { message: "New password must not exceed 255 characters" })
  new_password: string;
}
