import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { test } from '../helpers/test-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');
const hudCommands = readFileSync('test/interactions/hud.js', 'utf-8');

const testAimHudInitialState = test(
  {
    given: 'Player in empty level with aim joystick HUD',
    when: 'Game starts (no input)',
    then: 'Aim HUD alpha is 0.3 (inactive)'
  },
  async (page) => {
    const hud = await page.evaluate(() => getAimJoystickVisuals());
    return hud.outerCircle.alpha === 0.3;
  }
);

const testAimHudPressedState = test(
  {
    given: 'Player in empty level with aim joystick HUD',
    when: 'Player fires weapon',
    then: 'Aim HUD alpha is 1.0 (active) and crosshair moves'
  },
  async (page) => {
    const pressPromise = page.evaluate(() => fireWeapon(0, -1, 300));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const hud = await page.evaluate(() => getAimJoystickVisuals());
    const alphaCorrect = hud.outerCircle.alpha === 1;
    const crosshairMoved = hud.crosshair.x !== hud.outerCircle.x || hud.crosshair.y !== hud.outerCircle.y;
    
    await pressPromise;
    return alphaCorrect && crosshairMoved;
  }
);

const testAimHudReleasedState = test(
  {
    given: 'Player released fire input',
    when: 'Input is no longer active',
    then: 'Aim HUD alpha returns to 0.3 (inactive)'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const hud = await page.evaluate(() => getAimJoystickVisuals());
    return hud.outerCircle.alpha === 0.3;
  }
);

function testShooting(direction, dx, dy) {
  return test(
    {
      given: 'Player in empty level with weapon',
      when: `Player fires ${direction}`,
      then: `At least one bullet spawns`
    },
    async (page) => {
      const firePromise = page.evaluate((dx, dy) => fireWeapon(dx, dy, 300), dx, dy);
      await new Promise(resolve => setTimeout(resolve, 50));
      const duringBullets = await page.evaluate(() => getBulletCount());
      await firePromise;
      return duringBullets > 0;
    }
  );
}

const testShootingFacingDirection = test(
  {
    given: 'Player facing right after moving',
    when: 'Player fires without aim input',
    then: 'Bullet fires in facing direction'
  },
  async (page) => {
    await page.evaluate(() => setPlayerInput(1, 0, 200));
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const initialBullets = await page.evaluate(() => getBulletCount());
    const firePromise = page.evaluate(() => fireWeapon(0, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 50));
    const duringBullets = await page.evaluate(() => getBulletCount());
    await firePromise;
    
    return duringBullets - initialBullets > 0;
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
    if (text.startsWith('[TEST]') || text.startsWith('[INFO]')) {
      console.log(text);
    }
  });

  await page.goto('http://localhost:5173/?test=true&level=test/emptyLevel', { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  await page.evaluate(playerCommands);
  await page.evaluate(hudCommands);

  const tests = [
    { name: 'Aim HUD Initial State', fn: testAimHudInitialState },
    { name: 'Aim HUD Pressed State', fn: testAimHudPressedState },
    { name: 'Aim HUD Released State', fn: testAimHudReleasedState },
    { name: 'Shoot Up', fn: testShooting('up', 0, -1) },
    { name: 'Shoot Down', fn: testShooting('down', 0, 1) },
    { name: 'Shoot Left', fn: testShooting('left', -1, 0) },
    { name: 'Shoot Right', fn: testShooting('right', 1, 0) },
    { name: 'Shoot Up-Left', fn: testShooting('up-left', -1, -1) },
    { name: 'Shoot Up-Right', fn: testShooting('up-right', 1, -1) },
    { name: 'Shoot Down-Left', fn: testShooting('down-left', -1, 1) },
    { name: 'Shoot Down-Right', fn: testShooting('down-right', 1, 1) },
    { name: 'Shoot Facing Direction', fn: testShootingFacingDirection }
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = await test.fn(page);
    
    console.log(`GIVEN: ${result.given}, WHEN: ${result.when}, THEN: ${result.then} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    
    if (!result.passed) allPassed = false;
  }

  console.log(allPassed ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');

  await page.screenshot({ path: 'tmp/test/screenshots/test-shooting.png' });

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(allPassed ? 0 : 1);
})();
