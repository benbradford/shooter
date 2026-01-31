import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');

(async () => {
  outputGWT({
    title: 'Projectile Collision Test',
    given: 'Player is surrounded by a 5x5 wall box',
    when: 'Player fires bullets in all 8 directions',
    then: 'All bullets are blocked by walls and destroyed'
  });

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TEST]') || text.startsWith('[BULLET]')) {
      console.log(text);
    }
  });

  console.log('Navigating to game...');
  await page.goto('http://localhost:5173/?test=true&level=test/test-wall-collision', { waitUntil: 'networkidle2' });

  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  await page.evaluate(playerCommands);

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n=== TEST: Bullets blocked by walls ===');

  const directions = [
    { name: 'up', dx: 0, dy: -1 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'right', dx: 1, dy: 0 },
    { name: 'up-left', dx: -1, dy: -1 },
    { name: 'up-right', dx: 1, dy: -1 },
    { name: 'down-left', dx: -1, dy: 1 },
    { name: 'down-right', dx: 1, dy: 1 }
  ];

  let allBulletsBlocked = true;

  for (const dir of directions) {
    const beforeBullets = await page.evaluate(() => getBulletCount());

    await page.evaluate((dx, dy) => {
      fireWeapon(dx, dy, 100);
    }, dir.dx, dir.dy);

    await new Promise(resolve => setTimeout(resolve, 100));
    const duringBullets = await page.evaluate(() => getBulletCount());

    await new Promise(resolve => setTimeout(resolve, 400));
    const afterBullets = await page.evaluate(() => getBulletCount());

    const bulletsDestroyed = afterBullets === beforeBullets;
    console.log(`[TEST] ${dir.name}: before=${beforeBullets}, during=${duringBullets}, after=${afterBullets}, destroyed=${bulletsDestroyed}`);

    if (!bulletsDestroyed) {
      allBulletsBlocked = false;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n=== TEST RESULTS ===');
  console.log(`Bullets blocked by walls: ${allBulletsBlocked ? '✓' : '✗'}`);

  const success = allBulletsBlocked;

  if (success) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }

  await page.screenshot({ path: 'tmp/test/screenshots/test-projectile-collision.png' });

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(success ? 0 : 1);
})();
