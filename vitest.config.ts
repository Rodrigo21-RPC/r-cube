import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

const alias = {
  "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
  "@db": fileURLToPath(new URL("./src/db", import.meta.url)),
  "@worker": fileURLToPath(new URL("./src/worker", import.meta.url)),
  "@web": fileURLToPath(new URL("./src/web", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                BETTER_AUTH_SECRET: "secreto-de-pruebas-de-al-menos-32-caracteres",
                PUBLIC_URL: "http://localhost",
              },
            },
          }),
        ],
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          fileParallelism: false,
          testTimeout: 60000,
        },
      },
    ],
  },
});
