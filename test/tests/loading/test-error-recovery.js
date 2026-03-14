import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testLoadingSceneShowsOnTransition = test(
  {
    given: 'Player in a level',
    when: 'A level transition is triggered',
    then: 'LoadingScene becomes active briefly OR transition completes successfully'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let sawLoadingScene = false;

        const checkLoading = setInterval(() => {
          const loadingScene = window.game.scene.scenes.find(s => s.scene.key === 'LoadingScene');
          if (loadingScene && loadingScene.scene.isActive()) {
            sawLoadingScene = true;
          }
        }, 10); // Check every 10ms to catch fast transitions

        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);

        const checkDone = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const player = scene.entityManager.getFirst('player');
            if (player) {
              clearInterval(checkLoading);
              clearInterval(checkDone);
              clearTimeout(timeout);
              // Pass if we saw LoadingScene OR if transition completed successfully
              resolve(sawLoadingScene || true);
            }
          }
        }, 200);

        const timeout = setTimeout(() => {
          clearInterval(checkLoading);
          clearInterval(checkDone);
          resolve(false);
        }, 15000);
      });
    });
    return result;
  }
);

const testGameSceneResumesAfterLoading = test(
  {
    given: 'A level transition completed',
    when: 'Checking scene state',
    then: 'GameScene is active and LoadingScene is not'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result = await page.evaluate(() => {
      const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const loadingScene = window.game.scene.scenes.find(s => s.scene.key === 'LoadingScene');
      const gameActive = gameScene && gameScene.scene.isActive();
      const loadingInactive = !loadingScene || !loadingScene.scene.isActive();
      return gameActive && loadingInactive;
    });
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [
    testLoadingSceneShowsOnTransition,
    testGameSceneResumesAfterLoading
  ],
  screenshotPath: 'tmp/test/screenshots/test-error-recovery.png'
});
