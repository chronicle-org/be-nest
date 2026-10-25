import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTokenVersion1792930633411 implements MigrationInterface {
  name = "AddUserTokenVersion1792930633411";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "token_version" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "token_version"`);
  }
}
