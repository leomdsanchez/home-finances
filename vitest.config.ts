import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    dir: "tests",
    environment: "node",
    setupFiles: ["tests/setup/testEnv.ts"],
    testTimeout: 20000,
    sequence: {
      concurrent: false,
    },
  },
});
