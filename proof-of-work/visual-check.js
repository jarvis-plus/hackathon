import { chromium } from 'playwright';
import fs from 'fs';

async function visualCheck() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const errors = [];
  const warnings = [];
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  
  // Capture page errors
  page.on('pageerror', err => errors.push(err.message));
  
  try {
    // Load dashboard
    await page.goto('http://localhost:3457/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check for critical elements
    const checks = {
      title: await page.$('h1, .title, header'),
      stats: await page.$('.stat-card, .stats, [class*="stat"]'),
      activities: await page.$('.activity-card, .activity-item, [class*="activity"]'),
      noError: errors.length === 0
    };
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `/root/clawd/hackathon/proof-of-work/screenshots/check-${timestamp}.png`;
    
    // Ensure screenshots dir exists
    if (!fs.existsSync('/root/clawd/hackathon/proof-of-work/screenshots')) {
      fs.mkdirSync('/root/clawd/hackathon/proof-of-work/screenshots', { recursive: true });
    }
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Report
    console.log('\n=== VISUAL CHECK REPORT ===\n');
    console.log(`Screenshot: ${screenshotPath}`);
    console.log('');
    
    console.log('Element Checks:');
    console.log(`  Title/Header: ${checks.title ? '✅' : '❌ MISSING'}`);
    console.log(`  Stats Cards:  ${checks.stats ? '✅' : '❌ MISSING'}`);
    console.log(`  Activities:   ${checks.activities ? '✅' : '❌ MISSING'}`);
    console.log('');
    
    if (errors.length > 0) {
      console.log('❌ CONSOLE ERRORS:');
      errors.forEach(e => console.log(`  - ${e.substring(0, 200)}`));
      console.log('');
    } else {
      console.log('✅ No console errors\n');
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} console warnings (non-blocking)\n`);
    }
    
    // Overall status
    const passed = checks.title && checks.stats && checks.activities && errors.length === 0;
    console.log(passed ? '✅ VISUAL CHECK PASSED' : '❌ VISUAL CHECK FAILED - Review screenshot');
    
    await browser.close();
    process.exit(passed ? 0 : 1);
    
  } catch (e) {
    console.error('❌ VISUAL CHECK ERROR:', e.message);
    await page.screenshot({ path: '/tmp/visual-check-error.png' }).catch(() => {});
    await browser.close();
    process.exit(1);
  }
}

visualCheck();
