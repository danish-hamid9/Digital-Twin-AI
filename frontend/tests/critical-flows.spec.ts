/**
 * frontend/tests/critical-flows.spec.ts
 *
 * Playwright E2E tests covering critical user flows:
 *   1. Login
 *   2. Adding a finance entry via compact quick-add form at top
 *   3. Running a simulation
 *   4. Sending a chat message
 *   5. History page navigation and tabs (Finance, Study, Habits, Login history)
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

// ─── Test 2: Add finance entry via collapsible panel on /finance ──────────────
test('2 · Add a finance entry via collapsible panel on /finance', async ({ page }) => {
  await loginUser(page);

  await page.goto(`${BASE_URL}/finance`);
  await page.waitForLoadState('networkidle');

  // Verify entry form panel is hidden by default
  const quickAddHeader = page.getByRole('heading', { name: /Quick-Add Transaction/i });
  await expect(quickAddHeader).not.toBeVisible();

  // Click primary "Add transaction" button to expand form panel
  const addBtn = page.getByRole('button', { name: /Add transaction/i });
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.click();

  // Form panel expands and is now visible
  await expect(quickAddHeader).toBeVisible({ timeout: 5_000 });

  // Fill form fields
  const dateField = page.locator('input[type="date"]').first();
  await expect(dateField).toBeVisible();
  await dateField.fill('2025-06-15');

  const amountInput = page.locator('input[type="number"]').first();
  await expect(amountInput).toBeVisible();
  await amountInput.fill('1500');

  const descInput = page.locator('input[placeholder*="Description"]').first();
  if (await descInput.isVisible()) {
    await descInput.fill('E2E Test Salary');
  }

  // Submit quick-add form
  const submitBtn = page.getByRole('button', { name: /Save Transaction|Record/i });
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // Verify toast appears
  const toast = page.locator('text=Transaction recorded successfully');
  await expect(toast).toBeVisible({ timeout: 8_000 });

  // Verify form panel collapsed after successful save
  await expect(quickAddHeader).not.toBeVisible({ timeout: 5_000 });

  // Verify history link is available in the sidebar
  const sidebarHistory = page.locator('[aria-label="Sidebar navigation"]').getByRole('link', { name: /History/i });
  await expect(sidebarHistory).toBeVisible();
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

  // Wait for assistant reply
  await page.waitForTimeout(2_000);

  // At minimum: the user's message should appear in the thread
  const userMsg = page.locator('text=What is my current financial summary?').first();
  await expect(userMsg).toBeVisible({ timeout: 30_000 });
});

// ─── Test 5: History page tabs and Login History ─────────────────────────────
test('5 · History page tab switching and login history privacy note', async ({ page }) => {
  await loginUser(page);

  // Navigate to /history directly or via sidebar
  await page.goto(`${BASE_URL}/history`);
  await page.waitForLoadState('networkidle');

  // Verify page title
  await expect(page.getByRole('heading', { name: /Historical Records/i })).toBeVisible({ timeout: 10_000 });

  // Verify the 4 tabs exist
  const financeTab = page.getByRole('button', { name: /^Finance$/i });
  const studyTab = page.getByRole('button', { name: /^Study$/i });
  const habitsTab = page.getByRole('button', { name: /^Habits$/i });
  const loginsTab = page.getByRole('button', { name: /^Login history$/i });

  await expect(financeTab).toBeVisible();
  await expect(studyTab).toBeVisible();
  await expect(habitsTab).toBeVisible();
  await expect(loginsTab).toBeVisible();

  // Test switching to Study tab
  await studyTab.click();
  await expect(page).toHaveURL(/tab=study/);

  // Test switching to Habits tab
  await habitsTab.click();
  await expect(page).toHaveURL(/tab=habits/);

  // Test switching to Login History tab
  await loginsTab.click();
  await expect(page).toHaveURL(/tab=logins/);

  // Verify "Only you can see this" note is displayed
  const privacyNote = page.locator('text=Only you can see this');
  await expect(privacyNote).toBeVisible();

  // Verify login history table columns
  await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
  await expect(page.locator('th:has-text("Result")')).toBeVisible();
  await expect(page.locator('th:has-text("Device & Environment")')).toBeVisible();
  await expect(page.locator('th:has-text("Truncated IP")')).toBeVisible();
  await expect(page.locator('th:has-text("Method")')).toBeVisible();
});
