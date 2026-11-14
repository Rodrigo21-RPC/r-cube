import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// En local las variables vienen de .env; en CI y despliegue, del entorno.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
