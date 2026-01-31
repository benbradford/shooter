import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

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

runTests({
  level: 'test/emptyLevel',
  commands: ['test/interactions/player.js', 'test/interactions/hud.js'],
  tests: [
    testHudInitialState,
    testHudPressedState,
    testHudReleasedState,
    testMovement('up', 0, -1),
    testMovement('down', 0, 1),
    testMovement('left', -1, 0),
    testMovement('right', 1, 0),
    testMovement('up-left', -1, -1),
    testMovement('up-right', 1, -1),
    testMovement('down-left', -1, 1),
    testMovement('down-right', 1, 1)
  ],
  screenshotPath: 'tmp/test/screenshots/test-player-movement.png'
});
