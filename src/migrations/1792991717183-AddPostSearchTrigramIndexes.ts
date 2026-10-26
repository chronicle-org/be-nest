import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Trigram indexes so post search (ILIKE '%term%' on title, subtitle and tags)
 * doesn't scan every post. Needs the pg_trgm extension; if the database user
 * isn't allowed to create it, search keeps working without the indexes
 * instead of the app failing to boot.
 */
export class AddPostSearchTrigramIndexes1792991717183
  implements MigrationInterface
{
  name = "AddPostSearchTrigramIndexes1792991717183";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_trgm;
      EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
        RAISE NOTICE 'pg_trgm unavailable (%), skipping post search indexes', SQLERRM;
      END $$`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
          CREATE INDEX IF NOT EXISTS "IDX_post_title_trgm" ON "post" USING gin ("title" gin_trgm_ops);
          CREATE INDEX IF NOT EXISTS "IDX_post_sub_title_trgm" ON "post" USING gin ("sub_title" gin_trgm_ops);
          CREATE INDEX IF NOT EXISTS "IDX_post_tags_trgm" ON "post" USING gin ("tags" gin_trgm_ops);
        END IF;
      END $$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_post_tags_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_post_sub_title_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_post_title_trgm"`);
  }
}
