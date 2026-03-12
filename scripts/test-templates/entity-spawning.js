// Template for testing entity spawning
export function entitySpawningTemplate(config) {
  const { entityType, spawnCol, spawnRow, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testEntitySpawns = test(
  {
    given: 'Level with ${entityType}',
    when: 'Level loads',
    then: '${entityType} entity exists'
  },
  async (page) => {
    const entity = await page.evaluate((type) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene.entityManager.getFirst(type) !== null;
    }, '${entityType}');
    return entity === true;
  }
);

const testEntityPosition = test(
  {
    given: '${entityType} at (${spawnCol}, ${spawnRow})',
    when: 'Position is checked',
    then: 'Entity is at correct position'
  },
  async (page) => {
    const position = await page.evaluate((type) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const entity = scene.entityManager.getFirst(type);
      const gridPos = entity?.get(window.GridPositionComponent);
      return gridPos ? { col: gridPos.col, row: gridPos.row } : null;
    }, '${entityType}');
    return position && position.col === ${spawnCol} && position.row === ${spawnRow};
  }
);

runTests({
  level: 'test/test-${featureName}-spawning',
  commands: ['test/interactions/player.js'],
  tests: [testEntitySpawns, testEntityPosition],
  screenshotPath: 'test/screenshots/test-${featureName}-spawning.png'
});
`;
}
