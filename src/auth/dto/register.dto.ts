import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    example: "John Doe",
    description: "User full name (2-255 characters)",
  })
  @IsString()
  @MinLength(2, { message: "Name must be at least 2 characters" })
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  name: string;

  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
  })
  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @ApiProperty({
    example: "securePassword123",
    description: "User password (6-255 characters)",
  })
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(255, { message: "Password must not exceed 255 characters" })
  password: string;
}
