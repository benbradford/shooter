import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { test } from '../helpers/test-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');
const hudCommands = readFileSync('test/interactions/hud.js', 'utf-8');

const testHudInitialState = test(
  {
    given: 'Player in empty level with joystick HUD',
    when: 'Game starts (no input)',
    then: 'HUD alpha is 0.3 (inactive)'
  },
  async (page) => {
    const hud = await page.evaluate(() => getJoystickVisuals());
    return hud.outerCircle.alpha === 0.3;
  }
);

const testHudPressedState = test(
  {
    given: 'Player in empty level with joystick HUD',
    when: 'Player presses movement input',
    then: 'HUD alpha is 1.0 (active) and inner circle moves'
  },
  async (page) => {
    const pressPromise = page.evaluate(() => setPlayerInput(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const hud = await page.evaluate(() => getJoystickVisuals());
    const alphaCorrect = hud.outerCircle.alpha === 1;
    const innerMoved = hud.innerCircle.x !== hud.outerCircle.x || hud.innerCircle.y !== hud.outerCircle.y;
    
    await pressPromise;
    return alphaCorrect && innerMoved;
  }
);

const testHudReleasedState = test(
  {
    given: 'Player released movement input',
    when: 'Input is no longer active',
    then: 'HUD alpha returns to 0.3 (inactive)'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const hud = await page.evaluate(() => getJoystickVisuals());
    return hud.outerCircle.alpha === 0.3;
  }
);

function testMovement(direction, dx, dy) {
  return test(
    {
      given: 'Player in empty level',
      when: `Player moves ${direction}`,
      then: `Player moves >20px in ${direction} direction`
    },
    async (page) => {
      const initialPos = await page.evaluate(() => getPlayerPosition());
      await page.evaluate((dx, dy) => setPlayerInput(dx, dy, 300), dx, dy);
      const finalPos = await page.evaluate(() => getPlayerPosition());

      const movedX = dx !== 0 ? (dx > 0 ? finalPos.x > initialPos.x : finalPos.x < initialPos.x) : true;
      const movedY = dy !== 0 ? (dy > 0 ? finalPos.y > initialPos.y : finalPos.y < initialPos.y) : true;
      const distanceX = Math.abs(finalPos.x - initialPos.x);
      const distanceY = Math.abs(finalPos.y - initialPos.y);
      const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      return movedX && movedY && totalDistance > 20;
    }
  );
}

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
    { name: 'HUD Initial State', fn: testHudInitialState },
    { name: 'HUD Pressed State', fn: testHudPressedState },
    { name: 'HUD Released State', fn: testHudReleasedState },
    { name: 'Move Up', fn: testMovement('up', 0, -1) },
    { name: 'Move Down', fn: testMovement('down', 0, 1) },
    { name: 'Move Left', fn: testMovement('left', -1, 0) },
    { name: 'Move Right', fn: testMovement('right', 1, 0) },
    { name: 'Move Up-Left', fn: testMovement('up-left', -1, -1) },
    { name: 'Move Up-Right', fn: testMovement('up-right', 1, -1) },
    { name: 'Move Down-Left', fn: testMovement('down-left', -1, 1) },
    { name: 'Move Down-Right', fn: testMovement('down-right', 1, 1) }
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = await test.fn(page);
    
    console.log(`GIVEN: ${result.given}, WHEN: ${result.when}, THEN: ${result.then} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    
    if (!result.passed) allPassed = false;
  }

  console.log(allPassed ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');

  await page.screenshot({ path: 'tmp/test/screenshots/test-player-movement.png' });

  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }

  process.exit(allPassed ? 0 : 1);
})();
