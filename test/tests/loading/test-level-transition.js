import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testLevelLoadsSuccessfully = test(
  {
    given: 'A simple test level',
    when: 'The game loads',
    then: 'The GameScene is active with entities'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      if (!scene || !scene.scene.isActive()) return false;
      const player = scene.entityManager.getFirst('player');
      return !!player;
    });
    return result;
  }
);

const testNoMissingTextures = test(
  {
    given: 'A loaded level',
    when: 'Checking all sprites',
    then: 'No sprites use __MISSING texture'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const children = scene.children.list;
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          return false;
        }
      }
      return true;
    });
    return result;
  }
);

const testLevelTransitionViaLoadingScene = test(
  {
    given: 'Player in test-loading-simple level',
    when: 'Level transition is triggered programmatically',
    then: 'LoadingScene runs and GameScene restarts with new level'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('test/test-loading-complex', 2, 4);

        const checkInterval = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const player = scene.entityManager.getFirst('player');
            if (player) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              const levelName = scene.getCurrentLevelName();
              resolve(levelName === 'test/test-loading-complex');
            }
          }
        }, 200);

        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 15000);
      });
    });
    return result;
  }
);

const testTransitionBackToOriginal = test(
  {
    given: 'Player transitioned to test-loading-complex',
    when: 'Transitioning back to test-loading-simple',
    then: 'Player returns to original level'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);

        const checkInterval = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const player = scene.entityManager.getFirst('player');
            if (player) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              const levelName = scene.getCurrentLevelName();
              resolve(levelName === 'test/test-loading-simple');
            }
          }
        }, 200);

        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 15000);
      });
    });
    return result;
  }
);

const testNoMissingTexturesAfterTransition = test(
  {
    given: 'Player has transitioned between levels',
    when: 'Checking sprites after transition',
    then: 'No sprites use __MISSING texture'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const children = scene.children.list;
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          return false;
        }
      }
      return true;
    });
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [
    testLevelLoadsSuccessfully,
    testNoMissingTextures,
    testLevelTransitionViaLoadingScene,
    testTransitionBackToOriginal,
    testNoMissingTexturesAfterTransition
  ],
  screenshotPath: 'tmp/test/screenshots/test-level-transition.png'
});
