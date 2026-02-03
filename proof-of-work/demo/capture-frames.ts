#!/usr/bin/env bun
/**
 * Capture dashboard screenshots for demo video using Playwright
 */

import { chromium } from 'playwright';

const DASHBOARD_URL = 'http://localhost:3456/';
const OUTPUT_DIR = './frames';

async function captureFrames() {
  console.log('🎬 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('📸 Navigating to dashboard...');
  await page.goto(DASHBOARD_URL);
  await page.waitForTimeout(3000); // Wait for data to load

  // Scene 1: Hero shot - full dashboard view
  console.log('📸 Scene 1: Hero shot');
  await page.screenshot({ path: `${OUTPUT_DIR}/scene1_hero.png`, fullPage: false });

  // Scene 2: Activity Feed
  console.log('📸 Scene 2: Activity Feed');
  await page.click('button:has-text("📜 Activity Feed")').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene2_feed.png`, fullPage: false });

  // Scene 3: Verify tab
  console.log('📸 Scene 3: Verify tab');
  await page.click('button:has-text("🔍 Verify")').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene3_verify.png`, fullPage: false });

  // Scene 4: Key Decisions
  console.log('📸 Scene 4: Key Decisions');
  await page.click('button:has-text("🧠 Key Decisions")').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene4_decisions.png`, fullPage: false });

  // Scene 5: Milestones
  console.log('📸 Scene 5: Milestones');
  await page.click('button:has-text("🏆 Milestones")').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene5_milestones.png`, fullPage: false });

  // Scene 6: Tweets
  console.log('📸 Scene 6: Tweets');
  await page.click('button:has-text("🐦 Tweets")').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene6_tweets.png`, fullPage: false });

  // Scene 7: Meta story (scroll down)
  console.log('📸 Scene 7: Meta story (scrolled)');
  await page.click('button:has-text("📜 Activity Feed")').catch(() => {});
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene7_metastory.png`, fullPage: false });

  // Scene 8: Charts section
  console.log('📸 Scene 8: Charts');
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUTPUT_DIR}/scene8_charts.png`, fullPage: false });

  await browser.close();
  console.log('✅ All frames captured!');
}

captureFrames().catch(console.error);
