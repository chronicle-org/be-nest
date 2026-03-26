import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "src/user/user.entity";

@Entity()
export class NotificationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ default: true })
  notify_comments: boolean;

  @Column({ default: true })
  notify_likes: boolean;

  @Column({ default: true })
  notify_follows: boolean;

  @Column({ default: true })
  notify_bookmarks: boolean;

  @Column({ default: true })
  notify_replies: boolean;

  @Column({ default: true })
  notify_followed_posts_enabled: boolean;

  @Column({ type: "jsonb", default: [] })
  notify_followed_posts_from_users: number[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;
}
