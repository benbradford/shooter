// Template for testing range detection
export function rangeDetectionTemplate(config) {
  const { managerName, entityType, rangePx, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testInRange = test(
  {
    given: 'Player near ${entityType}',
    when: 'Range is checked',
    then: 'Returns true'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper(11, 11));
    const inRange = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const manager = window.${managerName}.getInstance();
      const player = scene.entityManager.getFirst('player');
      const grid = scene.grid;
      return manager.getClosestInteractableNPC(player, grid) !== null;
    });
    return inRange === true;
  }
);

const testOutOfRange = test(
  {
    given: 'Player far from ${entityType}',
    when: 'Range is checked',
    then: 'Returns false'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper(1, 1));
    const inRange = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const manager = window.${managerName}.getInstance();
      const player = scene.entityManager.getFirst('player');
      const grid = scene.grid;
      return manager.getClosestInteractableNPC(player, grid) !== null;
    });
    return inRange === false;
  }
);

runTests({
  level: 'test/test-${featureName}-range',
  commands: ['test/interactions/player.js'],
  tests: [testInRange, testOutOfRange],
  screenshotPath: 'test/screenshots/test-${featureName}-range.png'
});
`;
}
