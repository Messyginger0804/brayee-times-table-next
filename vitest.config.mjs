import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" }, // components use the automatic JSX runtime (as Next does)
  test: {
    coverage: {
      provider: "v8",
      reporter: ["json", "text-summary"], // json => coverage/coverage-final.json (Istanbul format, read by fallow)
      reportsDirectory: "coverage",
      // all:false => only files loaded by tests are reported. Unloaded files get v8 entries with
      // negative end columns, which make fallow reject the whole coverage file (u32 parse error).
      all: false,
      include: ["app/**", "lib/**", "components/**", "scripts/**"],
      exclude: ["tests/**", "**/*.test.*", "**/*.config.*", "**/node_modules/**", ".next/**", "coverage/**"],
    },
  },
});
