import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
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
    return this.repo.find();
  }

  async findOne(id: number): Promise<User | null> {
    const userData = await this.repo.findOneBy({ id });
    if (!userData) throw new NotFoundException();
    return userData;
  }
}
