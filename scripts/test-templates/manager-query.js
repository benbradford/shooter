// Template for testing manager query methods
export function managerQueryTemplate(config) {
  const { managerName, methodName, expectedResult, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testManagerQuery = test(
  {
    given: 'Manager initialized',
    when: '${methodName} is called',
    then: 'Returns ${expectedResult}'
  },
  async (page) => {
    const result = await page.evaluate((manager, method) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const mgr = window[manager].getInstance(scene);
      return mgr[method] !== undefined;
    }, '${managerName}', '${methodName}');
    return result === true;
  }
);

runTests({
  level: 'test/test-${featureName}-manager',
  commands: ['test/interactions/player.js'],
  tests: [testManagerQuery],
  screenshotPath: 'test/screenshots/test-${featureName}-manager.png'
});
`;
}
