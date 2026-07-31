import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

const order = await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s.entityManager.getAll().map((e,i) => `${i}:${e.id||[...e.tags][0]}`).slice(0,12);
});
console.log('ENTITY UPDATE ORDER:', order.join('  '));

await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile1').get(window.MovingTileComponent);
  const i = setInterval(() => { if (t.getTopLeftCol() === 10 && !t.getIsMoving()) { clearInterval(i); res(); } }, 30);
}));
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tr = s.entityManager.getFirst('player').require(window.TransformComponent);
  tr.x = 10*64+32; tr.y = 5*64+32;
});
await new Promise(r => setTimeout(r, 200));

// While the tile travels east, hold "walk north" input the whole time.
const res = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile1');
  const tile = tileE.get(window.MovingTileComponent);
  const tileTr = tileE.require(window.TransformComponent);
  const p = s.entityManager.getFirst('player');
  const pTr = p.require(window.TransformComponent);
  let ri = p.get(window.RemoteInputComponent); if (!ri) ri = p.add(new window.RemoteInputComponent());
  ri.setWalk(0, -1, true);          // hold north
  const samples = []; const start = Date.now();
  const i = setInterval(() => {
    samples.push({ ms: Date.now()-start, tileX: +tileTr.x.toFixed(1), pX: +pTr.x.toFixed(1),
                   dx: +(pTr.x-tileTr.x).toFixed(1), pY: +pTr.y.toFixed(1), moving: tile.getIsMoving() });
    if (Date.now()-start > 2200) { clearInterval(i); ri.setWalk(0,0,false); resolve(samples); }
  }, 220);
}));
console.log('\nRIDE + HOLD NORTH (dx should stay ~0 => carried; pY should change => independent):');
res.forEach(s => console.log('  ', JSON.stringify(s)));
await browser.close();
