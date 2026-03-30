import { IsString, MaxLength, IsOptional, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({
    description: "User's full name",
    example: "John Doe",
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255, { message: "Name must not exceed 255 characters" })
  name: string;

  @ApiProperty({
    description: "User's email address",
    example: "john@example.com",
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50, { message: "Email must not exceed 50 characters" })
  email: string;

  @ApiProperty({
    description: "User's hashed password",
    example: "$2b$10$...",
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255, { message: "Password hash must not exceed 255 characters" })
  password_hash: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: "Updated user name",
    example: "Jane Doe",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: "URL to user's profile picture",
    example: "https://example.com/pic.jpg",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: "Invalid picture URL" })
  @MaxLength(255)
  picture_url?: string;

  @ApiProperty({
    description: "URL to user's banner/header image",
    example: "https://example.com/banner.jpg",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: "Invalid banner URL" })
  @MaxLength(255)
  banner_url?: string;

  @ApiProperty({
    description: "User's profile bio/description",
    example: "Software engineer and open source contributor",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  profile_description?: string;

  @ApiProperty({
    description: "User's interest tags (comma-separated)",
    example: "coding,design,tech",
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tags?: string;
}
