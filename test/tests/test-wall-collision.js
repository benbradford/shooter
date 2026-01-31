import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

async function moveToCell(page, targetCol, targetRow, maxTimeMs = 2000) {
  await page.evaluate(() => enableRemoteInput());
  return await page.evaluate((col, row, maxTime) => {
    return moveToCellHelper(col, row, maxTime);
  }, targetCol, targetRow, maxTimeMs);
}

const testWallBlockTopRight = test(
  {
    given: 'Player at (6,5) surrounded by walls',
    when: 'Player tries to reach (7,3)',
    then: 'Player is blocked at (6,4)'
  },
  async (page) => {
    const result = await moveToCell(page, 7, 3);
    return !result.reached && result.col === 6 && result.row === 4;
  }
);

const testWallBlockBottomRight = test(
  {
    given: 'Player at (6,5) surrounded by walls',
    when: 'Player tries to reach (7,7)',
    then: 'Player is blocked at (6,6)'
  },
  async (page) => {
    const result = await moveToCell(page, 7, 7);
    return !result.reached && result.col === 6 && result.row === 6;
  }
);

const testWallBlockBottomLeft = test(
  {
    given: 'Player at (6,5) surrounded by walls',
    when: 'Player tries to reach (3,7)',
    then: 'Player is blocked at (4,6)'
  },
  async (page) => {
    const result = await moveToCell(page, 3, 7);
    return !result.reached && result.col === 4 && result.row === 6;
  }
);

const testWallBlockTopLeft = test(
  {
    given: 'Player at (6,5) surrounded by walls',
    when: 'Player tries to reach (3,3)',
    then: 'Player is blocked at (4,4)'
  },
  async (page) => {
    const result = await moveToCell(page, 3, 3);
    return !result.reached && result.col === 4 && result.row === 4;
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
