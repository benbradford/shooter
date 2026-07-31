import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Instrument the covering check
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  window.__scene = s;
});
await page.evaluate(() => new Promise(res => {
  const t = window.__scene.entityManager.getAll().find(e => e.id === 'moving_tile0').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol()===4 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
}));
// Board the EAST/leading edge cell (col 6, row 5)
await page.evaluate(() => {
  const tr = window.__scene.entityManager.getFirst('player').require(window.TransformComponent);
  tr.x = 6*64+32; tr.y = 5*64+32;
});
await new Promise(r=>setTimeout(r,150));
const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.__scene;
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile0');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  const gp = p.require(window.GridPositionComponent);
  const we = p.get(window.WaterEffectComponent);
  const grid = s.grid;
  const samples=[]; const start=Date.now();
  const i = setInterval(()=>{
    // compute box straddle cells
    const cb = gp.collisionBox;
    const bl = Math.floor((pTr.x + cb.offsetX - cb.width/2)/64);
    const br = Math.floor((pTr.x + cb.offsetX + cb.width/2 - 1)/64);
    samples.push({ms:Date.now()-start, tileCol:tile.getTopLeftCol(),
      pCell:`${gp.currentCell.col},${gp.currentCell.row}`, boxCols:`${bl}-${br}`,
      relX:+(pTr.x-tileTr.x).toFixed(1), onTile:tile.coversCell(gp.currentCell.col,gp.currentCell.row),
      inWater:we?.getIsInWater?.()??null, mv:tile.getIsMoving()});
    if (Date.now()-start>4000){clearInterval(i);resolve(samples);}
  },200);
}));
out.forEach(s=>console.log(JSON.stringify(s)));
await browser.close();
