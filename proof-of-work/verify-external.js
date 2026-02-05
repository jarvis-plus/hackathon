import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));

console.log('Loading https://jarvis.tail6a9bde.ts.net/pow-new ...');

try {
  const response = await page.goto('https://jarvis.tail6a9bde.ts.net/pow-new', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  console.log('Status:', response?.status());
  console.log('URL:', page.url());
  
  await page.waitForTimeout(3000);
  
  // Check what's actually on the page
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  
  console.log('Title:', title);
  console.log('Body preview:', bodyText);
  
  if (errors.length > 0) {
    console.log('\nConsole errors:', errors);
  }
  
  await page.screenshot({ path: 'screenshots/external-verify.png', fullPage: true });
  console.log('\nScreenshot saved to screenshots/external-verify.png');
  
} catch (e) {
  console.log('ERROR:', e.message);
}

await browser.close();
