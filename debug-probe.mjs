import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
page.on('console', m => console.log('[C]', m.text().slice(0,200)));
page.on('pageerror', e => console.log('[PE]', e.message.slice(0,200)));
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 4000));
const st = await page.evaluate(() => {
  const s = window.game?.scene?.scenes?.find(x => x.scene.key === 'game');
  return { hasScene: !!s, hasEM: !!s?.entityManager, hasPlayer: !!s?.entityManager?.getFirst?.('player') };
});
console.log('STATE', JSON.stringify(st));
await browser.close();
