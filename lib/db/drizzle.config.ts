import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/connection";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
