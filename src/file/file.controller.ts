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

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

@Controller("file")
export class FileController {
  constructor(private readonly supabaseService: FileService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
        else
          cb(
            new BadRequestException("Only JPEG, PNG, WebP or GIF images"),
            false,
          );
      },
    }),
  )
  async uploadFile(
    @Query() query: { type: keyof typeof fileUploadKey | "thumbnail" },
    @UploadedFile() file: Express.Multer.File,
  ) {
    // The mobile app sends "thumbnail" rather than the numeric key.
    const type = query.type === "thumbnail" ? 1 : query.type;
    if (!(type in fileUploadKey))
      throw new BadRequestException("Invalid upload type");
    if (!file) throw new BadRequestException("No attached file");
    const url = await this.supabaseService.uploadImage(file, type);
    return { url };
  }
}
