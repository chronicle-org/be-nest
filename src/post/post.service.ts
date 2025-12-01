import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, Repository } from "typeorm";
import { Post } from "./post.entity";

export interface PagedResult {
  data: Post[];
  total: number;
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private repo: Repository<Post>,
  ) {}

  async create(data: Partial<Post>): Promise<Post> {
    const postData: Partial<Post> = {
      user_id: data.user_id,
      content: data.content,
      created_at: new Date(),
      updated_at: new Date(),
      title: data.title,
      sub_title: data.sub_title,
      thumbnail_url: data.thumbnail_url,
    };

    const savedPost = await this.repo.save(postData);
    return savedPost;
  }

  async update(data: Partial<Post>): Promise<Post> {
    try {
      const postData = await this.repo.findOneBy({ id: data.id! });
      if (!postData) throw new NotFoundException("Post not found");
      else if (postData.user_id !== data.user_id)
        throw new UnauthorizedException("Unauthorized to update this post");
      await this.repo.update(
        { id: data.id },
        {
          content: data.content,
          title: data.title,
          sub_title: data.sub_title,
          thumbnail_url: data.thumbnail_url,
          updated_at: new Date(),
          visibility: data.visibility,
        },
      );
      return this.repo.findOneBy({ id: data.id! }) as Promise<Post>;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error updating post");
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;

    let searchCondition: Record<string, FindOperator<string>>[] = [];
    const searchTerms = search.split(/\s+/).filter((term) => term.length > 0);

    if (searchTerms.length > 0) {
      searchCondition = [
        { title: ILike(`%${search}%`) },
        { sub_title: ILike(`%${search}%`) },
      ];

      for (const term of searchTerms) {
        searchCondition.push({ tags: ILike(`%${term}%`) });
      }
    } else {
      searchCondition = [{}];
    }
    const [data, total] = await this.repo.findAndCount({
      where: searchCondition,
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  async findAllByUserId(
    user_id: number,
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;

    const baseCondition = { user_id };

    let searchConditions: Record<string, FindOperator<string> | number>[] = [];
    const searchTerms = search.split(/\s+/).filter((term) => term.length > 0);

    if (searchTerms.length > 0) {
      searchConditions = [
        { ...baseCondition, title: ILike(`%${search}%`) },
        { ...baseCondition, sub_title: ILike(`%${search}%`) },
      ];

      for (const term of searchTerms) {
        searchConditions.push({ ...baseCondition, tags: ILike(`%${term}%`) });
      }
    } else {
      searchConditions = [{ ...baseCondition }];
    }

    const [data, total] = await this.repo.findAndCount({
      where: searchConditions,
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Post | null> {
    try {
      const post = await this.repo.findOne({
        where: { id },
        relations: ["user"],
      });
      if (!post) throw new NotFoundException("Post not found");
      return post;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error fetching post");
    }
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    try {
      const post = await this.repo.findOneBy({ id });
      if (!post) throw new NotFoundException("Post not found");
      else if (post.user_id !== userId)
        throw new UnauthorizedException("Unauthorized to update this post");
      await this.repo.delete({ id });
      return { message: "Post deleted successfully" };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error deleting post");
    }
  }
}
