import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "src/user/user.entity";
import { Post } from "src/post/post.entity";

@Index(["post_id"])
@Index(["user_id"])
@Index(["parent_id"])
@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  post_id: number;

  @Column({ type: "text" })
  content: string;

  /** The comment this one replies to; null for top-level comments. Replies are one level deep. */
  @Column({ type: "integer", nullable: true })
  parent_id: number | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @CreateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post;

  @ManyToOne(() => Comment, (comment) => comment.replies, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parent_id" })
  parent: Comment | null;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];
}
