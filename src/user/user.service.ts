import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "./user.entity";
import { Post } from "../post/post.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
  ) {}

  create(data: Partial<User>): Promise<User> {
    return this.repo.save(data);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.repo.update(
      { id },
      {
        ...data,
      },
    );
    return this.repo.findOneBy({ id }) as Promise<User>;
  }

  findAll(): Promise<User[]> {
    return this.repo.find({
      order: {
        id: "ASC",
      },
    });
  }

  async findOne(id: number): Promise<User | null> {
    const userData = await this.repo.findOneBy({ id });
    if (!userData) throw new NotFoundException();
    return userData;
  }

  async follow(follower_id: number, followee_id: number): Promise<User> {
    const follower = await this.findOne(follower_id);
    const followee = await this.findOne(followee_id);
    if (!follower || !followee) throw new NotFoundException();
    follower.following = follower.following || [];
    follower.following.push(followee_id);
    follower.following_count++;
    followee.followers = followee.followers || [];
    followee.followers.push(follower_id);
    followee.followers_count++;
    await this.repo.save(follower);
    await this.repo.save(followee);
    return follower;
  }

  async unfollow(follower_id: number, followee_id: number): Promise<User> {
    const follower = await this.findOne(follower_id);
    const followee = await this.findOne(followee_id);
    if (!follower || !followee) throw new NotFoundException();
    follower.following = follower.following || [];
    follower.following = follower.following.filter((id) => id !== followee_id);
    follower.following_count--;
    followee.followers = followee.followers || [];
    followee.followers = followee.followers.filter((id) => id !== follower_id);
    followee.followers_count--;
    await this.repo.save(follower);
    await this.repo.save(followee);
    return follower;
  }

  async following(user_id: number): Promise<User[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const following = await this.repo.find({
      where: {
        id: In(user.following),
      },
    });
    return following;
  }

  async followers(user_id: number): Promise<User[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const followers = await this.repo.find({
      where: {
        id: In(user.followers),
      },
    });
    return followers;
  }

  async likes(user_id: number): Promise<Post[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const likes = await this.postRepo.find({
      where: {
        id: In(user.likes),
      },
    });
    return likes;
  }

  async bookmarks(user_id: number): Promise<Post[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const bookmarks = await this.postRepo.find({
      where: {
        id: In(user.bookmarks),
      },
      relations: ["user"],
    });
    return bookmarks;
  }
}
