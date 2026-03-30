import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
  })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @ApiProperty({
    example: "password123",
    description: "User password (minimum 6 characters)",
  })
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password: string;
}
