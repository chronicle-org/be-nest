import {
  IsString,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsUrl,
} from "class-validator";

export class CreatePostDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  sub_title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  @IsUrl({}, { message: "Invalid thumbnail URL" })
  @MaxLength(255)
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sub_title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl({}, { message: "Invalid thumbnail URL" })
  @MaxLength(255)
  thumbnail_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;

  @IsOptional()
  @IsBoolean()
  visibility?: boolean;
}
