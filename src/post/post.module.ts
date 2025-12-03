import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Post as PostEntity } from "./post.entity";
import { PostController } from "./post.controller";
import { PostService } from "./post.service";
import { User } from "src/user/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, User])],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
