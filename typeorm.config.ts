// Data source for the TypeORM CLI only (npm run migration:*). The app itself
// uses getDataSourceOptions() through TypeOrmModule in src/app.module.ts.
import "dotenv/config";
import { DataSource } from "typeorm";
import { join } from "path";
import { getDataSourceOptions } from "./src/database/options";

export default new DataSource({
  ...getDataSourceOptions(),
  entities: [join(__dirname, "src", "**", "*.entity{.ts,.js}")],
});
