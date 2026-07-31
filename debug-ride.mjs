import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
page.on('console', m => { if (m.text().startsWith('[RIDE]')) console.log(m.text()); });
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Wait for moving_tile1 parked at col 10, then board.
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile1').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol() === 10 && !t.getIsMoving()) { clearInterval(i); res(); } }, 30);
}));
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const p = s.entityManager.getFirst('player');
  const tr = p.require(window.TransformComponent);
  tr.x = 10 * 64 + 32; tr.y = 5 * 64 + 32;
});
await new Promise(r => setTimeout(r, 200));

// Sample: tile x vs player x while tile moves. No player input.
const passive = await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile1');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  const samples = [];
  const start = Date.now();
  const i = setInterval(() => {
    samples.push({ ms: Date.now()-start, tileX: +tileTr.x.toFixed(1), playerX: +pTr.x.toFixed(1),
                   offset: +(pTr.x - tileTr.x).toFixed(1), moving: tile.getIsMoving() });
    if (Date.now()-start > 2500) { clearInterval(i); res(samples); }
  }, 250);
}));
console.log('PASSIVE RIDE (no input) — offset should stay ~constant:');
passive.forEach(s => console.log('  ', JSON.stringify(s)));

await browser.close();
