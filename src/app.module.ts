import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { PostModule } from "./post/post.module";
import { CommentModule } from "./comment/comment.module";
import { FileModule } from "./file/file.module";
import { NotificationModule } from "./notifications/notification.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Default per-IP limit for every route; auth routes set a stricter one.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl:
        process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    }),
    UserModule,
    AuthModule,
    PostModule,
    CommentModule,
    FileModule,
    NotificationModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
