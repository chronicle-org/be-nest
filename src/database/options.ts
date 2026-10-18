import { DataSourceOptions } from "typeorm";
import { join } from "path";

/**
 * Shared TypeORM settings for the app and the migration CLI.
 * Schema changes go through migrations in src/migrations; the app runs
 * pending ones on boot instead of auto-syncing entities.
 * A function so env vars are read after ConfigModule has loaded .env.
 */
export const getDataSourceOptions = (): DataSourceOptions => ({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  synchronize: false,
  migrations: [join(__dirname, "..", "migrations", "*{.ts,.js}")],
  migrationsRun: true,
});
