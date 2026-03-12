// Template for testing UI state changes
export function uiStateChangeTemplate(config) {
  const { componentName, stateProperty, expectedValue, action, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testUIStateChange = test(
  {
    given: 'UI component in initial state',
    when: '${action}',
    then: '${stateProperty} is ${expectedValue}'
  },
  async (page) => {
    ${action ? `await page.evaluate(() => ${action});` : ''}
    
    const state = await page.evaluate((comp, prop) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'hud');
      const entities = scene.entityManager.getAll();
      for (const entity of entities) {
        const component = entity.get(window[comp]);
        if (component) {
          return component[prop];
        }
      }
      return null;
    }, '${componentName}', '${stateProperty}');
    return state === '${expectedValue}';
  }
);

runTests({
  level: 'test/test-${featureName}-ui',
  commands: ['test/interactions/player.js'],
  tests: [testUIStateChange],
  screenshotPath: 'test/screenshots/test-${featureName}-ui.png'
});
`;
}
