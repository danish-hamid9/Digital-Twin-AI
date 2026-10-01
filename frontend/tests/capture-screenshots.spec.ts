import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

test('Capture Bento Grid Overview Screenshots (Desktop & Mobile, Light & Dark)', async ({ browser }) => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 1. Desktop Context (1440 x 960)
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopCtx.newPage();

  // Navigate to login and use 1-click Demo Login
  await desktopPage.goto(`${BASE_URL}/login`);
  await desktopPage.waitForLoadState('networkidle');

  const demoBtn = desktopPage.locator('button:has-text("Try the demo account")');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
  } else {
    // Fallback: fill demo credentials
    await desktopPage.getByPlaceholder('alex@example.com').fill('demo@digitaltwin.ai');
    await desktopPage.getByPlaceholder('••••••••••••').fill('DemoPassword2026!');
    await desktopPage.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  }

  await desktopPage.waitForURL(/overview/, { timeout: 15000 });
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(2500); // Allow charts and SVG score rings to animate in

  // Capture Desktop Dark Mode
  await desktopPage.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'overview-desktop-dark.png'),
    fullPage: true,
  });
  console.log('Saved overview-desktop-dark.png');

  // Capture Desktop Light Mode
  await desktopPage.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'overview-desktop-light.png'),
    fullPage: true,
  });
  console.log('Saved overview-desktop-light.png');

  await desktopCtx.close();

  // 2. Mobile Context (390 x 844 - iPhone 14 standard)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();

  await mobilePage.goto(`${BASE_URL}/login`);
  await mobilePage.waitForLoadState('networkidle');

  const mobileDemoBtn = mobilePage.locator('button:has-text("Try the demo account")');
  if (await mobileDemoBtn.isVisible()) {
    await mobileDemoBtn.click();
  } else {
    await mobilePage.getByPlaceholder('alex@example.com').fill('demo@digitaltwin.ai');
    await mobilePage.getByPlaceholder('••••••••••••').fill('DemoPassword2026!');
    await mobilePage.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  }

  await mobilePage.waitForURL(/overview/, { timeout: 15000 });
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2500);

  // Capture Mobile Dark Mode
  await mobilePage.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'overview-mobile-dark.png'),
    fullPage: true,
  });
  console.log('Saved overview-mobile-dark.png');

  // Capture Mobile Light Mode
  await mobilePage.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'overview-mobile-light.png'),
    fullPage: true,
  });
  console.log('Saved overview-mobile-light.png');

  await mobileCtx.close();
});
