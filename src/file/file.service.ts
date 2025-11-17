import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { fileUploadKey } from "src/utils/constant";

@Injectable()
export class FileService {
  private readonly supabase: SupabaseClient<any, any, "public", any, any>;
  private readonly bucketName: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.bucketName = process.env.SUPABASE_BUCKET!;
  }

  async uploadImage(
    file: Express.Multer.File,
    key: keyof typeof fileUploadKey,
  ): Promise<string> {
    if (!file) throw new Error("No file provided");

    const fileExt: string = file.originalname.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileUploadKey[key]}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Failed to retrieve public URL");
    }

    return data.publicUrl;
  }
}
