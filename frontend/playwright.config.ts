import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Digital Twin AI frontend.
 * Targets the running Docker stack (frontend on :3000, backend on :8000).
 * Override PLAYWRIGHT_BASE_URL env var if running on a different port.
 */
export default defineConfig({
  testDir: './tests',
  // Run tests sequentially (auth state is shared)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    // Headless by default; set PLAYWRIGHT_HEADED=1 to see the browser
    headless: process.env.PLAYWRIGHT_HEADED !== '1',
    // Give pages 30s to load (ML inference can be slow on first start)
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
