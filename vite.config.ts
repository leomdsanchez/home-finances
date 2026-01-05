import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    dir: "tests",
    environment: "node",
    setupFiles: ["tests/setup/testEnv.ts"],
    testTimeout: 20000,
  },
});
