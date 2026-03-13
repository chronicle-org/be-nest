import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: "Name must be at least 2 characters" })
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  name: string;

  @IsEmail({}, { message: "Invalid email format" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(255, { message: "Password must not exceed 255 characters" })
  password: string;
}
