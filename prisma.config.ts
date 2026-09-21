import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed is intentionally NOT registered here so migrate reset / deploy
    // cannot auto-run the destructive CLIENT cleanup. Use: pnpm db:seed
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
