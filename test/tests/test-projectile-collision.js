import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { test } from '../helpers/test-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');

const testProjectileWallCollision = test(
  {
    given: 'Player is surrounded by a 5x5 wall box',
    when: 'Player fires bullets in all 8 directions',
    then: 'All bullets are blocked by walls and destroyed'
  },
  async (page) => {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ];

    let allBlocked = true;

    for (const dir of directions) {
      await page.evaluate((dx, dy) => fireWeapon(dx, dy, 100), dir.dx, dir.dy);
      await new Promise(resolve => setTimeout(resolve, 300));
      const afterBullets = await page.evaluate(() => getBulletCount());
      
      if (afterBullets !== 0) {
        allBlocked = false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return allBlocked;
  }
);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    const isVerbose = process.env.VERBOSE === 'true';
    
    if (text.startsWith('[DEBUG]')) {
      if (isVerbose) console.log(text);
      return;
    }
    if (text.startsWith('[TEST]') || text.startsWith('[INFO]') || text.startsWith('[BULLET]')) {
      console.log(text);
    }
  });

  await page.goto('http://localhost:5173/?test=true&level=test/test-wall-collision', { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  await page.evaluate(playerCommands);
  await new Promise(resolve => setTimeout(resolve, 500));

  const tests = [
    { name: 'Projectile Wall Collision', fn: testProjectileWallCollision }
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = await test.fn(page);
    
    console.log(`GIVEN: ${result.given}, WHEN: ${result.when}, THEN: ${result.then} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    
    if (!result.passed) allPassed = false;
  }

  console.log(allPassed ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');

  await page.screenshot({ path: 'tmp/test/screenshots/test-projectile-collision.png' });

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(allPassed ? 0 : 1);
})();
