import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

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

runTests({
  level: 'test/test-wall-collision',
  commands: ['test/interactions/player.js'],
  tests: [
    testProjectileWallCollision
  ],
  screenshotPath: 'tmp/test/screenshots/test-projectile-collision.png'
});