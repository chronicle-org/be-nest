import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { PostModule } from "./post/post.module";
import { CommentModule } from "./comment/comment.module";
import { getDataSourceOptions } from "./database/options";
import { RATE_LIMIT } from "./utils/constant";
import { FileModule } from "./file/file.module";
import { NotificationModule } from "./notifications/notification.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Default per-IP limit for every route; auth routes set a stricter one.
    ThrottlerModule.forRoot([RATE_LIMIT.GLOBAL]),
    TypeOrmModule.forRoot({
      ...getDataSourceOptions(),
      autoLoadEntities: true,
    }),
    UserModule,
    AuthModule,
    PostModule,
    CommentModule,
    FileModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
