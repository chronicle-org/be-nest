import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { Post } from "../post/post.entity";
import { Comment } from "../comment/comment.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  password_hash: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  picture_url: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  banner_url: string;

  @Column({ type: "varchar", length: 255, unique: true })
  handle: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  profile_description: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tags: string; // comma separated tags

  @Column({ type: "jsonb", default: [] })
  following: number[];

  @Column({ default: 0 })
  following_count: number;

  @Column({ type: "jsonb", default: [] })
  followers: number[];

  @Column({ default: 0 })
  followers_count: number;

  @Column({ type: "jsonb", default: [] })
  likes: number[];

  @Column({ default: 0 })
  likes_count: number;

  @Column({ type: "jsonb", default: [] })
  bookmarks: number[];

  @Column({ default: 0 })
  bookmarks_count: number;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];
}
