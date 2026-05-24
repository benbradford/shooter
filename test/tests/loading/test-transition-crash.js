import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testTransitionDoesNotCrash = test(
  {
    given: 'Player in test-loading-simple level',
    when: 'Level transition is triggered',
    then: 'No crash occurs (game continues running)'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        const startLevel = gameScene.getCurrentLevelName();

        gameScene.startLevelTransition('test/test-loading-complex', 2, 4);

        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');

          if (scene && scene.scene.isActive() && scene.entityManager) {
            const levelName = scene.getCurrentLevelName();
            if (levelName !== startLevel) {
              clearInterval(checkInterval);
              resolve(true);
              return;
            }
          }

          if (checks >= 30) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 500);
      });
    });

    if (errors.length > 0) {
      console.log(`❌ Page error: ${errors[0]}`);
      return false;
    }
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [testTransitionDoesNotCrash],
  screenshotPath: 'tmp/test/screenshots/test-transition-crash.png'
});
