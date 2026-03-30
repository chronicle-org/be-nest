import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "src/user/user.entity";
import { Post } from "src/post/post.entity";

export enum NotificationType {
  COMMENT = 1,
  LIKE = 2,
  FOLLOW = 3,
  BOOKMARK = 4,
  REPLY = 5,
  POST = 6,
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipient_id: number;

  @Column()
  actor_id: number;

  @Column({
    type: "smallint",
  })
  type: NotificationType;

  @Column({ type: "integer", nullable: true })
  post_id: number | null;

  @Column({ type: "integer", nullable: true })
  comment_id: number | null;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @Column({ default: false })
  read: boolean;

  @Column({ type: "timestamp", nullable: true })
  read_at: Date | null;

  @Column({ default: false })
  deleted: boolean;

  @Column({ type: "timestamp", nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "recipient_id" })
  recipient: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "actor_id" })
  actor: User;

  @ManyToOne(() => Post, { nullable: true })
  @JoinColumn({ name: "post_id" })
  post: Post | null;
}
