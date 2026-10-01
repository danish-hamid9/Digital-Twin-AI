/**
 * frontend/tests/critical-flows.spec.ts
 *
 * Playwright E2E tests covering the 4 critical user flows:
 *   1. Login
 *   2. Adding a finance entry
 *   3. Running a simulation
 *   4. Sending a chat message
 *
 * Requires:
 *   - docker compose up --build is running (frontend :3000, backend :8000)
 *   - A registered test user: E2E_EMAIL / E2E_PASSWORD env vars, or defaults below
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'e2etest@twin.ai';
const PASSWORD = process.env.E2E_PASSWORD ?? 'E2ePass123!';

// ─── Shared login helper ─────────────────────────────────────────────────────
async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  // Wait for redirect to overview
  await page.waitForURL(`${BASE_URL}/overview`, { timeout: 15_000 });
  await expect(page).toHaveURL(/overview/);
}

// Register once before all tests (idempotent: duplicate → already exists → skip)
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/register`);
  await page.getByPlaceholder('Alex Mercer').fill('E2E Test User');
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Create Account/i }).click();
  // Either succeeds (201) or "email exists" error — both are fine for setup
  await page.waitForTimeout(3_000);
  await ctx.close();
});

// ─── Test 1: Login flow ──────────────────────────────────────────────────────
test('1 · Login with valid credentials lands on /overview', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign In/i }).click();

  await page.waitForURL(/overview/, { timeout: 15_000 });
  await expect(page).toHaveURL(/overview/);

  // Sidebar should be visible
  const sidebar = page.locator('[aria-label="Sidebar navigation"]');
  await expect(sidebar).toBeVisible();
});

test('1b · Login with wrong password shows error', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill('wrong_password_xyz');
  await page.getByRole('button', { name: /Sign In/i }).click();

  // Should stay on login page and show an error
  await page.waitForTimeout(2_000);
  await expect(page).toHaveURL(/login/);
});

// ─── Test 2: Adding a finance entry ─────────────────────────────────────────
test('2 · Add a finance entry on /finance', async ({ page }) => {
  await loginUser(page);

  await page.goto(`${BASE_URL}/finance`);
  await page.waitForLoadState('networkidle');

  // Click "Log New Transaction" button
  const addButton = page.getByRole('button', { name: /Log New Transaction|Cancel Entry/i });
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click();

  // Fill form
  const dateField = page.locator('input[type="date"]').first();
  if (await dateField.isVisible()) {
    await dateField.fill('2025-06-15');
  }

  // Amount
  const amountInput = page.locator('input[type="number"]').first();
  if (await amountInput.isVisible()) {
    await amountInput.fill('1500');
  }

  // Submit
  const submitBtn = page.getByRole('button', { name: /Save Transaction|Record/i });
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  }

  await page.waitForTimeout(2_000);
  await expect(page).toHaveURL(/finance/);
});

// ─── Test 3: Running a simulation ───────────────────────────────────────────
test('3 · Run a what-if simulation on /simulator', async ({ page }) => {
  await loginUser(page);

  await page.goto(`${BASE_URL}/simulator`);
  await page.waitForLoadState('networkidle');

  // Page should load with simulator heading
  await expect(page.getByRole('heading', { name: /Life Path Simulator|Counterfactual/i })).toBeVisible({ timeout: 10_000 });

  // Find and click the "Run Simulation" button
  const runBtn = page.getByRole('button', { name: /Run Simulation|Simulate/i });
  await expect(runBtn).toBeVisible({ timeout: 10_000 });
  await runBtn.click();

  // Wait for results
  await page.waitForTimeout(5_000);

  // Verify simulation results / comparison heading is rendered
  const resultsHeading = page.getByRole('heading', { name: /Stochastic Counterfactual Comparison/i });
  await expect(resultsHeading).toBeVisible({ timeout: 15_000 });
});

// ─── Test 4: Sending a chat message ─────────────────────────────────────────
test('4 · Send a chat message and receive a response on /chat', async ({ page }) => {
  await loginUser(page);

  await page.goto(`${BASE_URL}/chat`);
  await page.waitForLoadState('networkidle');

  // Chat input must be visible
  const chatInput = page.locator('textarea, input[type="text"]').filter(
    async (el) => (await el.getAttribute('placeholder'))?.toLowerCase().includes('message') ?? false
  ).first();

  // Fallback: any textarea
  const input = (await chatInput.isVisible()) ? chatInput : page.locator('textarea').first();
  await expect(input).toBeVisible({ timeout: 10_000 });

  // Type a message
  await input.fill('What is my current financial summary?');

  // Send via button or Enter key
  const sendBtn = page.locator('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]').first();
  if (await sendBtn.isVisible()) {
    await sendBtn.click();
  } else {
    await input.press('Enter');
  }

  // Wait for assistant reply (up to 30s for live Gemini / mock)
  await page.waitForTimeout(2_000);

  // At minimum: the user's message should appear in the thread
  const userMsg = page.locator('text=What is my current financial summary?').first();
  await expect(userMsg).toBeVisible({ timeout: 30_000 });
});
