import { test } from '@playwright/test';
import * as path from 'path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'e2etest@twin.ai';
const PASSWORD = process.env.E2E_PASSWORD ?? 'E2ePass123!';

const SCREENSHOT_DIR = 'C:/Users/HP/.gemini/antigravity-ide/brain/8b1e8841-1c02-4eeb-89f7-a8194521203f';

test('Capture Screenshots for UI Fixes', async ({ page }) => {
  test.setTimeout(90_000);

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('alex@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  await page.waitForURL(/overview/, { timeout: 15_000 });

  // 1. Overview Page: Life Path Index, tooltip & data source badge
  await page.goto(`${BASE_URL}/overview`);
  await page.waitForLoadState('networkidle');
  // Hover over the Info icon for Life Path Index
  const infoBtn = page.getByRole('button', { name: /Life Path Index calculation info/i });
  if (await infoBtn.isVisible()) {
    await infoBtn.hover();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_1_overview_tooltip_badge.png'), fullPage: false });

  // 2. Finance Page: Primary "Add transaction" button & Collapsible panel open
  await page.goto(`${BASE_URL}/finance`);
  await page.waitForLoadState('networkidle');
  const addTxBtn = page.getByRole('button', { name: /Add transaction/i });
  await addTxBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_2_finance_collapsible_panel.png'), fullPage: false });

  // 3. Study Page: Primary "Add study session" button & Collapsible panel open
  await page.goto(`${BASE_URL}/study`);
  await page.waitForLoadState('networkidle');
  const addStudyBtn = page.getByRole('button', { name: /Add study session/i });
  await addStudyBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_3_study_collapsible_panel.png'), fullPage: false });

  // 4. Habits Page: Primary "Add habit log" button & Collapsible panel open
  await page.goto(`${BASE_URL}/habits`);
  await page.waitForLoadState('networkidle');
  const addHabitBtn = page.getByRole('button', { name: /Add habit log/i });
  await addHabitBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_4_habits_collapsible_panel.png'), fullPage: false });

  // 5. Chat Page: Confirm Dialog
  await page.goto(`${BASE_URL}/chat`);
  await page.waitForLoadState('networkidle');
  const chatInput = page.locator('input[placeholder*="Ask a question"], textarea').first();
  await chatInput.fill('Give me a quick forecast summary');
  await chatInput.press('Enter');
  await page.waitForTimeout(3000);
  const clearBtn = page.getByTestId('clear-chat-button');
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_5_chat_confirm_dialog.png'), fullPage: false });

  // 6. Tablet & Mobile Views of Layout (fixed sidebar / drawer & sticky header)
  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE_URL}/overview`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_6_tablet_layout.png'), fullPage: false });

  // Mobile drawer open
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/overview`);
  await page.waitForLoadState('networkidle');
  const menuBtn = page.getByLabel('Open navigation menu');
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screenshot_7_mobile_drawer.png'), fullPage: false });
});
