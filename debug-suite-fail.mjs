import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?test=true&level=test/test-moving-tile', { waitUntil: 'networkidle2' });
await page.waitForFunction(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  return s && s.entityManager && s.entityManager.getFirst('player');
}, { timeout: 15000 });

// Replicate testRiderCarriedByMovingTile exactly: wait moving_tile1 parked at col 10, teleport (10,5), wait col>=13.
const parked = await page.evaluate(() => new Promise(res => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const t = s.entityManager.getAll().find(e => e.id === 'moving_tile1').get(window.MovingTileComponent);
  const start = Date.now();
  const i = setInterval(() => {
    if (t.getTopLeftCol()===10 && !t.getIsMoving()) { clearInterval(i); res({matched:true}); }
    else if (Date.now()-start>10000) { clearInterval(i); res({matched:false, col:t.getTopLeftCol(), mv:t.getIsMoving()}); }
  }, 30);
}));
console.log('parked:', JSON.stringify(parked));
await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tr = s.entityManager.getFirst('player').require(window.TransformComponent);
  tr.x = 10*64+32; tr.y = 5*64+32;
});
await new Promise(r=>setTimeout(r,100));
const boarded = await page.evaluate(() => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const gp = s.entityManager.getFirst('player').require(window.GridPositionComponent);
  return {col: gp.currentCell.col, row: gp.currentCell.row};
});
console.log('boarded cell:', JSON.stringify(boarded));
const out = await page.evaluate(() => new Promise(resolve => {
  const s = window.game.scene.scenes.find(x => x.scene.key === 'game');
  const tileE = s.entityManager.getAll().find(e => e.id === 'moving_tile1');
  const tile = tileE.get(window.MovingTileComponent);
  const p = s.entityManager.getFirst('player');
  const gp = p.require(window.GridPositionComponent);
  const samples=[]; const start=Date.now();
  const i = setInterval(()=>{
    samples.push({ms:Date.now()-start, tileCol:tile.getTopLeftCol(), pCol:gp.currentCell.col, mv:tile.getIsMoving()});
    if (Date.now()-start>6000){clearInterval(i);resolve(samples);}
  },300);
}));
out.forEach(s=>console.log(JSON.stringify(s)));
await browser.close();
