import { defineConfig } from "vitest/config";

// Unit tests live next to the source they cover (src/**/*.test.ts).
// The Playwright end-to-end specs under tests/ are run separately via
// `npx playwright test` and must be excluded from the Vitest run.
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
  },
});
