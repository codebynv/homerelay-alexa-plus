// scripts/record-demo-shots.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('Launching Edge for live application capture...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[BROWSER PAGEERROR]', err.message));

  // 1. Capture Intro Slide
  console.log('Capturing Shot 1 (Intro)...');
  const introPath = 'file:///' + path.join(ROOT_DIR, 'demo-video/intro.html').replace(/\\/g, '/');
  await page.goto(introPath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot1.png') });

  // 2. Capture Live Dashboard (http://127.0.0.1:3000)
  console.log('Navigating to live HomeRelay web app (http://127.0.0.1:3000)...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  console.log('Capturing Shot 2 (Dashboard Overview)...');
  await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot2.png') });

  // 3. Focus input and type query
  console.log('Typing query into plan input...');
  const inputSelector = 'input.input';
  await page.waitForSelector(inputSelector);
  await page.click(inputSelector);
  await page.type(inputSelector, 'plan dinner for 4 guests under $50', { delay: 30 });
  await new Promise(r => setTimeout(r, 600));
  console.log('Capturing Shot 3 (Query Typed & Pantry View)...');
  await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot3.png') });

  // 4. Click Create Plan button
  console.log('Clicking Create Plan button...');
  const buttons = await page.$$('button.btn-primary');
  console.log(`Found ${buttons.length} btn-primary buttons`);
  if (buttons.length > 0) {
    await buttons[0].click();
  }

  // Wait a few seconds to inspect what happens
  await new Promise(r => setTimeout(r, 2000));
  const pageContent = await page.evaluate(() => document.body.innerText);
  console.log('Page text snippet after plan click:', pageContent.slice(0, 300).replace(/\n+/g, ' '));

  // Check if modal exists
  const hasModal = await page.$('.modal');
  console.log('Has modal element:', Boolean(hasModal));
  if (hasModal) {
    console.log('Capturing Shot 4 (Execution Plan Preview Modal)...');
    await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot4.png') });

    // Click Accept & Execute
    console.log('Clicking Accept & Execute...');
    const acceptBtn = await page.$('.modal-footer button.btn-primary');
    if (acceptBtn) {
      await acceptBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      console.log('Capturing Shot 5 (Plan Executed Success)...');
      await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot5_executed.png') });
    }
  } else {
    console.log('No modal found, saving debug screenshot...');
    await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot4_debug.png') });
  }

  // Capture Alexa MCP Architecture panel
  console.log('Capturing Shot 5 (Alexa & MCP Architecture)...');
  const alexaPath = 'file:///' + path.join(ROOT_DIR, 'demo-video/alexa-mcp.html').replace(/\\/g, '/');
  await page.goto(alexaPath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot5_mcp.png') });

  // 6. Capture Outro Slide
  console.log('Capturing Shot 6 (Outro)...');
  const outroPath = 'file:///' + path.join(ROOT_DIR, 'demo-video/outro.html').replace(/\\/g, '/');
  await page.goto(outroPath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ROOT_DIR, 'demo-video/shot6.png') });

  await browser.close();
  console.log('Screenshot sequence completed!');
}

main().catch(err => {
  console.error('Failed to capture shots:', err);
  process.exit(1);
});
