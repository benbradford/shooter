import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile-ride', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

async function boardCenter() {
  await page.evaluate(() => new Promise(res => {
    const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
    const t = s.entityManager.getAll().find(e => e.id === 'moving_tile0').get(window.MovingTileComponent);
    const i = setInterval(() => { if (t.getTopLeftCol() === 6 && !t.getIsMoving()) { clearInterval(i); res(); } }, 25);
  }));
  await page.evaluate(() => {
    const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
    const tr = s.entityManager.getFirst('player').require(window.TransformComponent);
    tr.x = 7*64+32; tr.y = 5*64+32;   // center of the 3x3 footprint
  });
  await new Promise(r => setTimeout(r, 150));
}

async function sample(label, dx, dy) {
  await boardCenter();
  const out = await page.evaluate(({dx,dy}) => new Promise(resolve => {
    const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
    const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile0');
    const tile = tileE.get(window.MovingTileComponent);
    const tileTr = tileE.require(window.TransformComponent);
    const p = s.entityManager.getFirst('player');
    const pTr = p.require(window.TransformComponent);
    let ri = p.get(window.RemoteInputComponent);
    if (!ri) ri = p.add(new window.RemoteInputComponent());
    if (dx || dy) ri.setWalk(dx, dy, true);
    const samples = []; const start = Date.now();
    const i = setInterval(() => {
      samples.push({ ms: Date.now()-start,
        relX: +(pTr.x - tileTr.x).toFixed(1), relY: +(pTr.y - tileTr.y).toFixed(1),
        onTile: tile.coversCell(Math.floor(pTr.x/64), Math.floor(pTr.y/64)), mv: tile.getIsMoving() });
      if (Date.now()-start > 1800) { clearInterval(i); ri.setWalk(0,0,false); resolve(samples); }
    }, 200);
  }), {dx,dy});
  console.log(`\n${label}:`);
  out.forEach(s => console.log('  ', JSON.stringify(s)));
}

await sample('A) 3x3 tile, NO input — rel offset must stay constant', 0, 0);
await sample('B) 3x3 tile, hold NORTH — must stay onTile, relY should decrease', 0, -1);
await browser.close();
