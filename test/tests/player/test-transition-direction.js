import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testTransitionPreservesDirection = test(
  {
    given: 'Player moving upward before a level transition',
    when: 'Player transitions to a new level',
    then: 'Player spawns facing the same direction (up)'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        const player = gameScene.entityManager.getFirst('player');
        const walk = player.require(window.WalkComponent);

        // Set the player direction to Up (enum value 2) before transition
        walk.lastDir = 2; // Direction.Up
        walk.lastMoveX = 0;
        walk.lastMoveY = -1;

        // Trigger a level transition back to the same level
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);

        let checks = 0;
        const check = setInterval(() => {
          checks++;
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const newPlayer = scene.entityManager.getFirst('player');
            if (newPlayer && checks > 5) {
              const newWalk = newPlayer.require(window.WalkComponent);
              clearInterval(check);
              clearTimeout(timeout);
              resolve({
                lastDir: newWalk.lastDir,
                lastMoveX: newWalk.lastMoveX,
                lastMoveY: newWalk.lastMoveY
              });
            }
          }
        }, 200);

        const timeout = setTimeout(() => {
          clearInterval(check);
          resolve({ lastDir: -1, lastMoveX: 0, lastMoveY: 0 });
        }, 15000);
      });
    });

    // Direction.Up = 2, lastMoveY should be -1 for up
    return result.lastDir === 2 && result.lastMoveY === -1;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [testTransitionPreservesDirection],
  screenshotPath: 'tmp/test/screenshots/test-transition-direction.png'
});
