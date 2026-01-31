import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');


(async () => {
  outputGWT({
    title: 'Wall Collision Test',
    given: 'Player is surrounded by a 5x5 wall box',
    when: [
      'Player fires bullets in all 8 directions',
      'Player moves in diagonal circle'
    ],
    then: [
      'All bullets are blocked by walls',
      'Player movement is blocked by walls'
    ]
  });

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TEST]')) {
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

  // Test firing in 8 directions
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

    await new Promise(resolve => setTimeout(resolve, 300));

    const afterBullets = await page.evaluate(() => getBulletCount());

    // Bullets should be destroyed by walls (count should be 0 or very low)
    const bulletsBlocked = afterBullets === 0;
    console.log(`[TEST] ${dir.name}: bullets=${afterBullets}, blocked=${bulletsBlocked}`);

    if (!bulletsBlocked) {
      allBulletsBlocked = false;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n=== TEST: Player blocked by walls ===');

  // Get actual center position (player spawns at cell * cellSize, not centered)
  const cellSize = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene.grid.cellSize;
  });

  const initialPos = await page.evaluate(() => getPlayerPosition());
  console.log(`[TEST] Initial position: (${initialPos.x.toFixed(0)}, ${initialPos.y.toFixed(0)})`);
  console.log(`[TEST] Cell size: ${cellSize}`);

  // Try moving in diagonal circle: up-right, down-right, down-left, up-left, up-right
  const movements = [
    { name: 'up-right', dx: 1, dy: -1 },
    { name: 'down-right', dx: 1, dy: 1 },
    { name: 'down-left', dx: -1, dy: 1 },
    { name: 'up-left', dx: -1, dy: -1 },
    { name: 'up-right', dx: 1, dy: -1 }
  ];

  let playerStayedInside = true;

  for (const move of movements) {
    const beforePos = await page.evaluate(() => getPlayerPosition());

    await page.evaluate((dx, dy) => {
      setPlayerInput(dx, dy, 1500);
    }, move.dx, move.dy);

    await new Promise(resolve => setTimeout(resolve, 1550));

    const afterPos = await page.evaluate(() => getPlayerPosition());
    const distanceMoved = Math.hypot(afterPos.x - beforePos.x, afterPos.y - beforePos.y);

    // Player should move but be blocked by walls
    // With 1500ms movement time at 300px/s speed, max distance = ~450px
    // If blocked by walls, should move less than 3 cells (192px)
    const wasBlocked = distanceMoved < cellSize * 3;
    console.log(`[TEST] ${move.name}: moved=${distanceMoved.toFixed(0)}px, blocked=${wasBlocked}`);

    if (!wasBlocked) {
      playerStayedInside = false;
    }
  }

  const finalPos = await page.evaluate(() => getPlayerPosition());

  console.log('\n=== TEST RESULTS ===');
  console.log(`Bullets blocked by walls: ${allBulletsBlocked ? '✓' : '✗'}`);
  console.log(`Player blocked by walls: ${playerStayedInside ? '✓' : '✗'}`);
  console.log(`Final position: (${finalPos.x.toFixed(0)}, ${finalPos.y.toFixed(0)})`);

  const success = allBulletsBlocked && playerStayedInside;

  if (success) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }

  await page.screenshot({ path: 'tmp/test/screenshots/test-wall-collision.png' });

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(success ? 0 : 1);
})();
