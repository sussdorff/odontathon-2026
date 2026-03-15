import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000, // 3 min — real agent calls
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  // Requires both servers running with real agent:
  //   Terminal 1: bun run dev              (backend on :3001)
  //   Terminal 2: cd frontend && bun run dev  (frontend on :3000)
  //
  // Before apply tests: bun run reset:demo-data
  // After apply tests:  bun run reset:demo-data
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
