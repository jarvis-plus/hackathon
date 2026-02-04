import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Check for console errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto('http://localhost:3457/pow-new', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

await page.screenshot({ path: 'screenshots/pow-new.png', fullPage: true });
console.log('Screenshot saved');
if (errors.length > 0) console.log('Errors:', errors);

await browser.close();
