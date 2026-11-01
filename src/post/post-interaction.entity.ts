import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { User } from "src/user/user.entity";
import { Post } from "./post.entity";

/**
 * One row per user per liked post. The jsonb `likes` arrays on post and user
 * are still written alongside these rows so API responses keep their shape.
 */
@Index(["post_id"])
@Entity()
export class PostLike {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  post_id: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;
}

/** One row per user per bookmarked post; see PostLike. */
@Index(["post_id"])
@Entity()
export class PostBookmark {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  post_id: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;
}
