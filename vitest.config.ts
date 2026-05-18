import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["services/*/src/**/*.test.ts"],
  },
  server: {
    deps: {
      inline: [/@orgos\//],
    },
  },
});
