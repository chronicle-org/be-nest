import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    example: "oldPassword123",
    description: "The user's current password",
  })
  @IsString()
  @MinLength(1, { message: "Current password is required" })
  current_password: string;

  @ApiProperty({
    example: "newPassword456",
    description: "New password (6-255 characters)",
  })
  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters" })
  @MaxLength(255, { message: "New password must not exceed 255 characters" })
  new_password: string;
}
