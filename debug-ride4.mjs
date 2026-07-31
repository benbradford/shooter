import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// park & board at the SOUTH edge of footprint so a little northward walk stays aboard
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile0').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol() === 6 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
}));
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tr = s.entityManager.getFirst('player').require(window.TransformComponent);
  tr.x = 7*64+32; tr.y = 6*64+32; // bottom-center cell of 3x3
});
await new Promise(r => setTimeout(r, 150));

const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile0');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  let ri = p.get(window.RemoteInputComponent);
  if (!ri) ri = p.add(new window.RemoteInputComponent());
  ri.setWalk(0, -1, true); // walk north while tile moves east
  const samples = []; const start = Date.now();
  const i = setInterval(() => {
    samples.push({ ms: Date.now()-start, relX: +(pTr.x-tileTr.x).toFixed(1), relY: +(pTr.y-tileTr.y).toFixed(1),
      onTile: tile.coversCell(Math.floor(pTr.x/64), Math.floor(pTr.y/64)), mv: tile.getIsMoving() });
    if (Date.now()-start > 1300) { clearInterval(i); ri.setWalk(0,0,false); resolve(samples); }
  }, 150);
}));
console.log('COMBINED — tile east + player north; relX must stay 0 (carried), relY must rise (independent), onTile true:');
out.forEach(s => console.log('  ', JSON.stringify(s)));
await browser.close();
