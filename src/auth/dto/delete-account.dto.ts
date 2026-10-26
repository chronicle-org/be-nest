import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeleteAccountDto {
  @ApiProperty({
    example: "myPassword123",
    description: "The user's current password, to confirm the deletion",
  })
  @IsString()
  @MinLength(1, { message: "Password is required" })
  password: string;
}
