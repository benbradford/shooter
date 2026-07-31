import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Park 3x3 tile at col 6. Player starts at (2,5). Walk EAST onto tile, then release, let it carry over water.
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile0').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol()===6 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
}));
const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile0');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  const gp = p.require(window.GridPositionComponent);
  const we = p.get(window.WaterEffectComponent);
  let ri = p.get(window.RemoteInputComponent);
  if (!ri) ri = p.add(new window.RemoteInputComponent());
  ri.setWalk(1, 0, true); // walk east
  const samples = []; const start = Date.now();
  const i = setInterval(() => {
    // release input once player is on the tile center col 7
    if (gp.currentCell.col === 7) ri.setWalk(0,0,false);
    samples.push({ ms: Date.now()-start, tileCol: tile.getTopLeftCol(),
      pCell: `${gp.currentCell.col},${gp.currentCell.row}`,
      relX: +(pTr.x-tileTr.x).toFixed(1), onTile: tile.coversCell(gp.currentCell.col, gp.currentCell.row),
      inWater: we?.getIsInWater?.() ?? null, mv: tile.getIsMoving() });
    if (Date.now()-start > 3000) { clearInterval(i); ri.setWalk(0,0,false); resolve(samples); }
  }, 200);
}));
out.forEach(s => console.log(JSON.stringify(s)));
await browser.close();
