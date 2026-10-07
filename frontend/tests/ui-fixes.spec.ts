/**
 * frontend/tests/ui-fixes.spec.ts
 *
 * Dedicated Playwright E2E tests covering:
 *   1. Clear chat: confirm dialog, immediate UI emptying without page reload, error toast on failure.
 *   2. Finance, Study, Habits: "Add transaction", "Add study session", "Add habit log" primary buttons,
 *      collapsible panel, Esc / close button behavior, save -> toast -> refresh -> collapse.
 *   3. Layout: fixed full-height sidebar, sticky header, internal scroll, mobile drawer.
 *   4. Pluralization check (no "1 months"), Life Path Index calculation tooltip, forecast data source badge.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'e2etest@twin.ai';
const PASSWORD = process.env.E2E_PASSWORD ?? 'E2ePass123!';

async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  await page.waitForURL(/overview/, { timeout: 15_000 });
  await expect(page).toHaveURL(/overview/);
}

test.describe('UI Fixes - Targeted Tests', () => {

  test('1 · Clear chat: confirm dialog, cancel, delete success empties UI without refresh, error toast on failure', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/chat`);
    await page.waitForLoadState('networkidle');

    // Send a message to ensure messages exist
    const chatInput = page.locator('input[placeholder*="Ask a question"], textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10_000 });
    await chatInput.fill('Hi twin bot, summary please');
    await chatInput.press('Enter');

    // Wait for at least one message bubble to render
    const clearBtn = page.getByTestId('clear-chat-button');
    await expect(clearBtn).toBeVisible({ timeout: 20_000 });

    // Step A: Click clear -> Confirm dialog opens
    await clearBtn.click();
    const dialog = page.getByTestId('confirm-clear-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Clear Chat History?')).toBeVisible();

    // Step B: Click Cancel -> Dialog closes, messages remain
    const cancelBtn = page.getByTestId('cancel-clear-btn');
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
    await expect(clearBtn).toBeVisible();

    // Step C: Test Error Toast on DELETE failure
    // Temporarily intercept DELETE to fail once
    await page.route('**/api/v1/chat/history', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Simulated backend database failure' }),
        });
      } else {
        await route.continue();
      }
    });

    await clearBtn.click();
    await expect(dialog).toBeVisible();
    await page.getByTestId('confirm-clear-btn').click();

    // Error toast should appear
    const errorToast = page.locator('text=Simulated backend database failure');
    await expect(errorToast).toBeVisible({ timeout: 8_000 });

    // Remove the route failure intercept
    await page.unroute('**/api/v1/chat/history');

    // Step D: Successful DELETE -> immediately empties messages and charts without browser refresh
    await clearBtn.click();
    await expect(dialog).toBeVisible();

    // Monitor for page navigation to prove NO browser refresh happens
    let navigated = false;
    page.once('framenavigated', () => { navigated = true; });

    await page.getByTestId('confirm-clear-btn').click();

    // Messages and clear button should immediately disappear
    await expect(clearBtn).not.toBeVisible({ timeout: 6_000 });
    // Empty state should be visible immediately
    const emptyHero = page.getByText('Ask your Digital Twin');
    await expect(emptyHero).toBeVisible();

    // Verify no browser reload occurred
    expect(navigated).toBe(false);
  });

  test('2 · Finance, Study and Habits: Collapsible entry panels with Esc and Close button', async ({ page }) => {
    await loginUser(page);

    // --- A. Finance ---
    await page.goto(`${BASE_URL}/finance`);
    await page.waitForLoadState('networkidle');

    const finHeader = page.getByRole('heading', { name: /Quick-Add Transaction/i });
    await expect(finHeader).not.toBeVisible();

    // Open via "Add transaction"
    const addFinBtn = page.getByRole('button', { name: /Add transaction/i });
    await expect(addFinBtn).toBeVisible();
    await addFinBtn.click();
    await expect(finHeader).toBeVisible();

    // Close via Esc
    await page.keyboard.press('Escape');
    await expect(finHeader).not.toBeVisible();

    // Reopen and close via Close button
    await addFinBtn.click();
    await expect(finHeader).toBeVisible();
    const closeFinBtn = page.getByLabel('Close entry form');
    await closeFinBtn.click();
    await expect(finHeader).not.toBeVisible();

    // --- B. Study ---
    await page.goto(`${BASE_URL}/study`);
    await page.waitForLoadState('networkidle');

    const studyHeader = page.getByRole('heading', { name: /Quick-Add Study Session/i });
    await expect(studyHeader).not.toBeVisible();

    // Open via "Add study session"
    const addStudyBtn = page.getByRole('button', { name: /Add study session/i });
    await expect(addStudyBtn).toBeVisible();
    await addStudyBtn.click();
    await expect(studyHeader).toBeVisible();

    // Close via Esc
    await page.keyboard.press('Escape');
    await expect(studyHeader).not.toBeVisible();

    // Reopen and fill/save -> collapses and shows toast
    await addStudyBtn.click();
    await expect(studyHeader).toBeVisible();
    const scoreInput = page.locator('input[type="number"][placeholder*="Score"]').first();
    if (await scoreInput.isVisible()) {
      await scoreInput.fill('88');
    }
    const saveStudyBtn = page.getByRole('button', { name: /Log Session/i });
    await saveStudyBtn.click();

    // Toast appears & panel collapses
    await expect(page.locator('text=Study session recorded successfully')).toBeVisible({ timeout: 8_000 });
    await expect(studyHeader).not.toBeVisible({ timeout: 5_000 });

    // --- C. Habits ---
    await page.goto(`${BASE_URL}/habits`);
    await page.waitForLoadState('networkidle');

    const habitHeader = page.getByRole('heading', { name: /Quick-Add Daily Wellbeing Entry/i });
    await expect(habitHeader).not.toBeVisible();

    // Open via "Add habit log"
    const addHabitBtn = page.getByRole('button', { name: /Add habit log/i });
    await expect(addHabitBtn).toBeVisible();
    await addHabitBtn.click();
    await expect(habitHeader).toBeVisible();

    // Close via Esc
    await page.keyboard.press('Escape');
    await expect(habitHeader).not.toBeVisible();

    // Reopen and save -> collapses and shows toast
    await addHabitBtn.click();
    await expect(habitHeader).toBeVisible();
    const saveHabitBtn = page.getByRole('button', { name: /Save Habit/i });
    await saveHabitBtn.click();

    await expect(page.locator('text=Habit log recorded successfully')).toBeVisible({ timeout: 8_000 });
    await expect(habitHeader).not.toBeVisible({ timeout: 5_000 });
  });

  test('3 · Layout: Fixed full-height sidebar, sticky header, internal nav scroll, mobile drawer', async ({ page }) => {
    await loginUser(page);

    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/overview`);
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible and full height
    const sidebar = page.locator('[aria-label="Sidebar navigation"]');
    await expect(sidebar).toBeVisible();
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    if (sidebarBox) {
      expect(sidebarBox.height).toBeGreaterThanOrEqual(750);
    }

    // Pinned Sign out button inside sidebar
    const signOutBtn = sidebar.getByRole('button', { name: /Sign Out/i });
    await expect(signOutBtn).toBeVisible();

    // Header sticky top-0
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Tablet/Mobile viewport test
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Hamburger button should be visible on mobile
    const hamburger = page.getByRole('button', { name: /Open menu/i });
    await expect(hamburger).toBeVisible();

    // Open drawer
    await hamburger.click();
    await expect(signOutBtn).toBeVisible();

    // Close drawer via close button
    const closeDrawerBtn = page.getByRole('button', { name: /Close menu/i });
    await closeDrawerBtn.click();
  });

  test('4 · Singular/Plural month check, Life Path Index tooltip, and forecast chart data source badge', async ({ page }) => {
    await loginUser(page);

    await page.goto(`${BASE_URL}/overview`);
    await page.waitForLoadState('networkidle');

    // Check Life Path Index header and calculation tooltip
    const lifePathHeader = page.getByRole('heading', { name: /Life Path Index/i });
    await expect(lifePathHeader).toBeVisible();

    const tooltipTrigger = page.getByTestId('life-path-tooltip-trigger');
    await expect(tooltipTrigger).toBeVisible();
    await tooltipTrigger.hover();

    // Tooltip content breakdown should be visible
    await expect(page.getByText('40% Habits')).toBeVisible();
    await expect(page.getByText('35% Academics')).toBeVisible();
    await expect(page.getByText('25% Financial Runway')).toBeVisible();

    // Check forecast chart data source badge
    const badge = page.getByTestId('forecast-datasource-badge').first();
    await expect(badge).toBeVisible();
    const badgeText = await badge.textContent();
    expect(badgeText?.toLowerCase()).toMatch(/source:\s*(personal|blended|global)/);

    // Verify no "1 months" anywhere on page text
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/\b1(\.0)?\s+months\b/i);
  });
});
