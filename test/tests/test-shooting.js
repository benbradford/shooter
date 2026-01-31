import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

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

runTests({
  level: 'test/emptyLevel',
  commands: ['test/interactions/player.js', 'test/interactions/hud.js'],
  tests: [
    testAimHudInitialState,
    testAimHudPressedState,
    testAimHudReleasedState,
    testShooting('up', 0, -1),
    testShooting('down', 0, 1),
    testShooting('left', -1, 0),
    testShooting('right', 1, 0),
    testShooting('up-left', -1, -1),
    testShooting('up-right', 1, -1),
    testShooting('down-left', -1, 1),
    testShooting('down-right', 1, 1),
    testShootingFacingDirection
  ],
  screenshotPath: 'tmp/test/screenshots/test-shooting.png'
});