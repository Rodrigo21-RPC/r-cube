import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// En local, las contraseñas del seed están en .env; en CI vienen del entorno.
if (existsSync(".env")) process.loadEnvFile(".env");

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: ci ? 1 : 0,
  reporter: ci ? "github" : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173/api/health",
    reuseExistingServer: !ci,
    timeout: 180_000,
  },
  projects: [
    { name: "claro-movil", use: { ...devices["Pixel 7"], colorScheme: "light" } },
    { name: "oscuro-escritorio", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
  ],
});
