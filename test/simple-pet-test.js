import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  page.on('pageerror', error => console.log('💥', error.message));
  
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
  
  console.log('Waiting 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('Done - check browser window');
})();
