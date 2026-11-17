import { defineConfig } from 'vitest/config'

// Test files use the `.wtest.ts` suffix so the root project's `vitest run`
// (default pattern `*.test.ts`) never picks them up.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.wtest.ts'],
  },
})
