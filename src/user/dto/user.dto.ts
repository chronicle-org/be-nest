import { IsString, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsString()
  @MaxLength(50, { message: 'Email must not exceed 50 characters' })
  email: string;

  @IsString()
  @MaxLength(255, { message: 'Password hash must not exceed 255 characters' })
  password_hash: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid picture URL' })
  @MaxLength(255)
  picture_url?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid banner URL' })
  @MaxLength(255)
  banner_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  profile_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tags?: string;
}
