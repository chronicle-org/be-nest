import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileService } from "./file.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { fileUploadKey } from "src/utils/constant";

@Controller("file")
export class FileController {
  constructor(private readonly supabaseService: FileService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Query() query: { type: keyof typeof fileUploadKey },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { type } = query;
    if (!file) throw new BadRequestException("No attached file");
    const url = await this.supabaseService.uploadImage(file, type);
    return { url };
  }
}
