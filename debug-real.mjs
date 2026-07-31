import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Board 1x1 moving_tile1 at col 10 via teleport, no input, watch cell + water while it moves.
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile1').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol()===10 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
}));
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tr = s.entityManager.getFirst('player').require(window.TransformComponent);
  tr.x = 10*64+32; tr.y = 5*64+32;
});
await new Promise(r => setTimeout(r, 150));
const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile1');
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
      relX: +(pTr.x-tileTr.x).toFixed(1), inWater: we?.getIsInWater?.() ?? null, mv: tile.getIsMoving() });
    if (Date.now()-start > 1600) { clearInterval(i); resolve(samples); }
  }, 150);
}));
out.forEach(s => console.log(JSON.stringify(s)));
await browser.close();
