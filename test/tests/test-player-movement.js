import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';


const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');
const hudCommands = readFileSync('test/interactions/hud.js', 'utf-8');

(async () => {
  outputGWT({
    title: 'Player Movement Test',
    given: 'A player in an empty 10x10 level',
    when: 'The player receives movement input in each of 8 directions',
    then: 'The player should move in the correct direction (>20px)'
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
  console.log('\nTesting HUD visuals...');

  // Check initial state (not pressed)
  const initialHud = await page.evaluate(() => getJoystickVisuals());
  console.log(`Initial HUD alpha: ${initialHud.outerCircle.alpha} (should be 0.3)`);

  if (initialHud.outerCircle.alpha !== 0.3) {
    console.log('✗ HUD initial alpha incorrect');
    allPassed = false;
  }

  // Press and check HUD updates
  const pressPromise = page.evaluate(() => setPlayerInput(1, 0, 300));
  await new Promise(resolve => setTimeout(resolve, 50));

  const pressedHud = await page.evaluate(() => getJoystickVisuals());
  console.log(`Pressed HUD alpha: ${pressedHud.outerCircle.alpha} (should be 1.0)`);
  console.log(`Inner circle moved: ${pressedHud.innerCircle.x !== pressedHud.outerCircle.x || pressedHud.innerCircle.y !== pressedHud.outerCircle.y}`);

  if (pressedHud.outerCircle.alpha !== 1) {
    console.log('✗ HUD pressed alpha incorrect');
    allPassed = false;
  }

  await pressPromise;
  await new Promise(resolve => setTimeout(resolve, 50));

  // Check released state
  const releasedHud = await page.evaluate(() => getJoystickVisuals());
  console.log(`Released HUD alpha: ${releasedHud.outerCircle.alpha} (should be 0.3)`);

  if (releasedHud.outerCircle.alpha !== 0.3) {
    console.log('✗ HUD released alpha incorrect');
    allPassed = false;
  }

  console.log('HUD visuals: ✓\n');

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
    console.log(`\nTesting ${dir.name} movement...`);

    const initialPos = await page.evaluate(() => getPlayerPosition());
    await page.evaluate((dx, dy) => setPlayerInput(dx, dy, 300), dir.dx, dir.dy);
    const finalPos = await page.evaluate(() => getPlayerPosition());

    const movedX = dir.dx !== 0 ? (dir.dx > 0 ? finalPos.x > initialPos.x : finalPos.x < initialPos.x) : true;
    const movedY = dir.dy !== 0 ? (dir.dy > 0 ? finalPos.y > initialPos.y : finalPos.y < initialPos.y) : true;
    const distanceX = Math.abs(finalPos.x - initialPos.x);
    const distanceY = Math.abs(finalPos.y - initialPos.y);
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    const passed = movedX && movedY && totalDistance > 20;
    results.push({ direction: dir.name, passed, distance: totalDistance.toFixed(0) });

    if (!passed) allPassed = false;

    console.log(`  Distance: ${totalDistance.toFixed(0)} pixels - ${passed ? '✓' : '✗'}`);
  }

  console.log('\n=== TEST RESULTS ===');
  for (const result of results) {
    console.log(`${result.direction}: ${result.passed ? '✓' : '✗'} (${result.distance}px)`);
  }

  if (allPassed) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }

  await page.screenshot({ path: 'tmp/test/screenshots/test-player-movement.png' });
  console.log('\nScreenshot saved to tmp/test/screenshots/test-player-movement.png');

  await browser.close();

  process.exit(allPassed ? 0 : 1);
})();
