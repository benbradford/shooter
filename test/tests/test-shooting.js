import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');
const hudCommands = readFileSync('test/interactions/hud.js', 'utf-8');

(async () => {
  outputGWT({
    title: 'Weapon Firing Test',
    given: 'A player in an empty 10x10 level with a weapon',
    when: 'The player fires in each of 8 directions + facing direction',
    then: 'At least one bullet should spawn for each firing action'
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
  await page.goto('http://localhost:5173/?test=true&level=test/emptyLevel', { waitUntil: 'networkidle2' });

  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  await page.evaluate(playerCommands);
  await page.evaluate(hudCommands);

  // Test HUD visuals first
  console.log('\nTesting aim HUD visuals...');

  // Check initial state (not pressed)
  const initialHud = await page.evaluate(() => getAimJoystickVisuals());
  console.log(`Initial aim HUD alpha: ${initialHud.outerCircle.alpha} (should be 0.3)`);

  if (initialHud.outerCircle.alpha !== 0.3) {
    console.log('✗ Aim HUD initial alpha incorrect');
    allPassed = false;
  }

  // Press and check HUD updates
  const pressPromise = page.evaluate(() => fireWeapon(0, -1, 300));
  await new Promise(resolve => setTimeout(resolve, 50));

  const pressedHud = await page.evaluate(() => getAimJoystickVisuals());
  console.log(`Pressed aim HUD alpha: ${pressedHud.outerCircle.alpha} (should be 1.0)`);
  console.log(`Crosshair moved: ${pressedHud.crosshair.x !== pressedHud.outerCircle.x || pressedHud.crosshair.y !== pressedHud.outerCircle.y}`);

  if (pressedHud.outerCircle.alpha !== 1) {
    console.log('✗ Aim HUD pressed alpha incorrect');
    allPassed = false;
  }

  await pressPromise;
  await new Promise(resolve => setTimeout(resolve, 50));

  // Check released state
  const releasedHud = await page.evaluate(() => getAimJoystickVisuals());
  console.log(`Released aim HUD alpha: ${releasedHud.outerCircle.alpha} (should be 0.3)`);

  if (releasedHud.outerCircle.alpha !== 0.3) {
    console.log('✗ Aim HUD released alpha incorrect');
    allPassed = false;
  }

  console.log('Aim HUD visuals: ✓\n');

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

  let allPassed = true;
  const results = [];

  for (const dir of directions) {
    console.log(`\nTesting ${dir.name} shooting...`);

    const firePromise = page.evaluate((dx, dy) => fireWeapon(dx, dy, 300), dir.dx, dir.dy);

    await new Promise(resolve => setTimeout(resolve, 50));

    const duringBullets = await page.evaluate(() => getBulletCount());
    await firePromise;
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const afterBullets = await page.evaluate(() => getBulletCount());

    // If bullets were fired, count should have been > 0 during firing
    const passed = duringBullets > 0;
    results.push({ direction: dir.name, passed, bullets: duringBullets });

    if (!passed) allPassed = false;

    console.log(`  Bullets fired: ${duringBullets} - ${passed ? '✓' : '✗'}`);
  }

  // Test shooting in last facing direction (no aim input)
  console.log('\nTesting shooting in facing direction (no aim)...');

  // First move right to set facing direction
  await page.evaluate(() => setPlayerInput(1, 0, 200));
  await new Promise(resolve => setTimeout(resolve, 250));

  // Then shoot without aim direction (should shoot right)
  const initialBullets = await page.evaluate(() => getBulletCount());
  const firePromise = page.evaluate(() => fireWeapon(0, 0, 300));

  await new Promise(resolve => setTimeout(resolve, 50));

  const duringBullets = await page.evaluate(() => getBulletCount());
  await firePromise;

  const bulletsFired = duringBullets - initialBullets;
  const facingPassed = bulletsFired > 0;
  results.push({ direction: 'facing', passed: facingPassed, bullets: bulletsFired });

  if (!facingPassed) allPassed = false;

  console.log(`  Bullets fired: ${bulletsFired} - ${facingPassed ? '✓' : '✗'}`);

  console.log('\n=== TEST RESULTS ===');
  for (const result of results) {
    console.log(`${result.direction}: ${result.passed ? '✓' : '✗'} (${result.bullets} bullets)`);
  }

  if (allPassed) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }

  await page.screenshot({ path: 'tmp/test/screenshots/test-shooting.png' });
  console.log('\nScreenshot saved to tmp/test/screenshots/test-shooting.png');

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(allPassed ? 0 : 1);
})();
