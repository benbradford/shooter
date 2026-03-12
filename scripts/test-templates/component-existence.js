// Template for testing component existence and basic behavior
export function componentExistenceTemplate(config) {
  const { componentName, entityType, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testComponentExists = test(
  {
    given: '${entityType} entity',
    when: 'Entity is queried',
    then: 'Has ${componentName}'
  },
  async (page) => {
    const hasComponent = await page.evaluate((type, comp) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const entity = scene.entityManager.getFirst(type);
      return entity && entity.get(window[comp]) !== undefined;
    }, '${entityType}', '${componentName}');
    return hasComponent === true;
  }
);

runTests({
  level: 'test/test-${featureName}-component',
  commands: ['test/interactions/player.js'],
  tests: [testComponentExists],
  screenshotPath: 'test/screenshots/test-${featureName}-component.png'
});
`;
}
