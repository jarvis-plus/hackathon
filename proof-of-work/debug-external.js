import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone size

const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));
page.on('requestfailed', req => logs.push(`[FAILED] ${req.url()} - ${req.failure()?.errorText}`));

console.log('Loading https://jarvis.tail6a9bde.ts.net/pow-new ...');

try {
  await page.goto('https://jarvis.tail6a9bde.ts.net/pow-new', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  await page.waitForTimeout(5000);
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== PAGE CONTENT ===');
  console.log(bodyText.slice(0, 1000));
  
  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  
  await page.screenshot({ path: 'screenshots/debug-mobile.png', fullPage: true });
  
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
