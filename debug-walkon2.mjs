import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Walk EAST onto the parked 3x3 tile (starts col 4, player at col 3). Board center col 5, then release.
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const p = s.entityManager.getFirst('player');
  let ri = p.get(window.RemoteInputComponent);
  if (!ri) ri = p.add(new window.RemoteInputComponent());
  window.__ri = ri;
});
// Walk until player reaches col 5 (center of footprint), then stop.
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const p = s.entityManager.getFirst('player');
  const gp = p.require(window.GridPositionComponent);
  window.__ri.setWalk(1,0,true);
  const i = setInterval(() => { if (gp.currentCell.col >= 5) { clearInterval(i); window.__ri.setWalk(0,0,false); res(); } }, 20);
}));
await new Promise(r=>setTimeout(r,200));
console.log('Boarded. Now waiting for tile to start moving over water...');
const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile0');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  const gp = p.require(window.GridPositionComponent);
  const we = p.get(window.WaterEffectComponent);
  const samples = []; const start = Date.now();
  const i = setInterval(() => {
    samples.push({ ms: Date.now()-start, tileCol: tile.getTopLeftCol(),
      pCell: `${gp.currentCell.col},${gp.currentCell.row}`,
      relX: +(pTr.x-tileTr.x).toFixed(1), onTile: tile.coversCell(gp.currentCell.col, gp.currentCell.row),
      inWater: we?.getIsInWater?.() ?? null, mv: tile.getIsMoving() });
    if (Date.now()-start > 5500) { clearInterval(i); resolve(samples); }
  }, 250);
}));
out.forEach(s => console.log(JSON.stringify(s)));
await browser.close();
