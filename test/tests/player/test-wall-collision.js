import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function resetPlayerToStart(page) {
  await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const transform = player.require(window.TransformComponent);
    transform.x = 6 * 64 + 32;
    transform.y = 5 * 64 + 32;
  });
}

async function moveToCell(page, targetCol, targetRow, maxTimeMs = 2000) {
  await resetPlayerToStart(page);
  await page.evaluate(() => enableRemoteInput());
  return await page.evaluate((col, row, maxTime) => {
    return moveToCellHelper(col, row, maxTime);
  }, targetCol, targetRow, maxTimeMs);
}

const testWallBlockTopRight = test(
  {
    given: 'Player surrounded by walls',
    when: 'Player tries to exit diagonally up-right',
    then: 'Player is blocked by wall'
  },
  async (page) => {
    const result = await moveToCell(page, 7, 3);
    return !result.reached;
  }
);

const testWallBlockBottomRight = test(
  {
    given: 'Player surrounded by walls',
    when: 'Player tries to exit diagonally down-right',
    then: 'Player is blocked by wall'
  },
  async (page) => {
    const result = await moveToCell(page, 7, 7);
    return !result.reached;
  }
);

const testWallBlockBottomLeft = test(
  {
    given: 'Player surrounded by walls',
    when: 'Player tries to exit diagonally down-left',
    then: 'Player is blocked by wall'
  },
  async (page) => {
    const result = await moveToCell(page, 3, 7);
    return !result.reached;
  }
);

const testWallBlockTopLeft = test(
  {
    given: 'Player surrounded by walls',
    when: 'Player tries to exit diagonally up-left',
    then: 'Player is blocked by wall'
  },
  async (page) => {
    const result = await moveToCell(page, 3, 3);
    return !result.reached;
  }
);

runTests({
  level: 'test/test-wall-collision',
  commands: ['test/interactions/player.js'],
  tests: [
    testWallBlockTopRight,
    testWallBlockBottomRight,
    testWallBlockBottomLeft,
    testWallBlockTopLeft
  ],
  screenshotPath: 'tmp/test/screenshots/test-wall-collision.png'
});
