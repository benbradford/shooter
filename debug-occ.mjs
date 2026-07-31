import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });
await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile0').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol()===6 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
}));
const info = await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const p = s.entityManager.getFirst('player');
  const tr = p.require(window.TransformComponent);
  tr.x = 7*64+32; tr.y = 5*64+32;
  // force a collision update tick by waiting handled outside; report occupancy of footprint cells
  const grid = s.grid;
  const cells = [];
  for (let row=4; row<7; row++) for (let col=6; col<9; col++) {
    const c = grid.getCell(col,row);
    const occ = [...(c?.occupants||[])].map(e=>e.id||[...e.tags][0]);
    if (occ.includes('player')) cells.push(`${col},${row}`);
  }
  return { boxOffsetY: 24, playerOccupies: cells };
});
console.log(JSON.stringify(info));
await new Promise(r=>setTimeout(r,200));
const info2 = await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const grid = s.grid;
  const cells = [];
  for (let row=3; row<8; row++) for (let col=6; col<9; col++) {
    const c = grid.getCell(col,row);
    const occ = [...(c?.occupants||[])].map(e=>e.id||[...e.tags][0]);
    if (occ.includes('player')) cells.push(`${col},${row}`);
  }
  return { playerOccupiesAfterTick: cells };
});
console.log(JSON.stringify(info2));
await browser.close();
