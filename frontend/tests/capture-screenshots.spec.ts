import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/screenshots');

test('Capture Bento Grid Insights, Plans, Settings, and Chat Screenshots (Desktop & Mobile, Light & Dark)', async ({ browser }) => {
  test.setTimeout(240_000);
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
    await desktopPage.getByPlaceholder('alex@example.com').fill('demo@digitaltwin.ai');
    await desktopPage.getByPlaceholder('••••••••••••').fill('DemoPassword2026!');
    await desktopPage.getByRole('button', { name: /Sign In|Authenticating/i }).click();
  }

  await desktopPage.waitForURL(/overview/, { timeout: 15000 });
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(2000);

  // Helper to capture a page in light & dark on desktop
  const captureDesktopLightDark = async (urlPath: string, baseName: string) => {
    await desktopPage.goto(`${BASE_URL}${urlPath}`);
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(1000);

    // Light Mode
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('twin_theme', 'light');
    });
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${baseName}-desktop-light.png`),
      fullPage: true,
    });
    console.log(`Saved ${baseName}-desktop-light.png`);

    // Dark Mode
    await desktopPage.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('twin_theme', 'dark');
    });
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${baseName}-desktop-dark.png`),
      fullPage: true,
    });
    console.log(`Saved ${baseName}-desktop-dark.png`);
  };

  // Capture Chat on Desktop with live interactive conversation & inline chart
  await desktopPage.goto(`${BASE_URL}/chat`);
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(1000);

  // Send a simulation query to populate tool chip, inline fan chart, and small notice
  const chatInput = desktopPage.locator('input[placeholder*="Ask a question"]');
  if (await chatInput.isVisible()) {
    await chatInput.fill('What happens to my savings if I buy a $1,000 laptop over 6 months?');
    await desktopPage.locator('button[type="submit"]').click();
    // Wait for the tool call and response to complete
    await desktopPage.waitForTimeout(12000);
  }

  // Light Mode Screenshot
  await desktopPage.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('twin_theme', 'light');
  });
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'chat-desktop-light.png'),
    fullPage: true,
  });
  console.log('Saved chat-desktop-light.png');

  // Dark Mode Screenshot
  await desktopPage.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('twin_theme', 'dark');
  });
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'chat-desktop-dark.png'),
    fullPage: true,
  });
  console.log('Saved chat-desktop-dark.png');

  // Capture other key pages
  await captureDesktopLightDark('/recommendations', 'recommendations');
  await captureDesktopLightDark('/plans', 'plans');
  await captureDesktopLightDark('/settings', 'settings');
  await captureDesktopLightDark('/overview', 'overview');

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
  await mobilePage.waitForTimeout(2000);

  // Helper to capture a page in light & dark on mobile
  const captureMobileLightDark = async (urlPath: string, baseName: string) => {
    await mobilePage.goto(`${BASE_URL}${urlPath}`);
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(1000);

    // Light Mode
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('twin_theme', 'light');
    });
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${baseName}-mobile-light.png`),
      fullPage: true,
    });
    console.log(`Saved ${baseName}-mobile-light.png`);

    // Dark Mode
    await mobilePage.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('twin_theme', 'dark');
    });
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, `${baseName}-mobile-dark.png`),
      fullPage: true,
    });
    console.log(`Saved ${baseName}-mobile-dark.png`);
  };

  // Capture Chat on Mobile
  await captureMobileLightDark('/chat', 'chat');
  await captureMobileLightDark('/recommendations', 'recommendations');
  await captureMobileLightDark('/plans', 'plans');
  await captureMobileLightDark('/settings', 'settings');

  await mobileCtx.close();
});
