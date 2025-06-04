import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      include: ["src/*"],
      exclude: ['example/**'], // Exclude from coverage report
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
})