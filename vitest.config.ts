import { defineConfig } from "vitest/config"
import dotenv from "dotenv"

dotenv.config()

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
