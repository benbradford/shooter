import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testTextureCountDoesNotGrowAfterTransition = test(
  {
    given: 'Player in a level',
    when: 'Transitioning to another level and back',
    then: 'Texture count does not grow unboundedly'
  },
  async (page) => {
    const initialCount = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene.textures.getTextureKeys().length;
    });

    // Transition to complex level
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('test/test-loading-complex', 2, 4);
        const check = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager && scene.entityManager.getFirst('player')) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 200);
        const timeout = setTimeout(() => { clearInterval(check); resolve(); }, 15000);
      });
    });

    // Transition back
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);
        const check = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager && scene.entityManager.getFirst('player')) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 200);
        const timeout = setTimeout(() => { clearInterval(check); resolve(); }, 15000);
      });
    });

    const finalCount = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene.textures.getTextureKeys().length;
    });

    // Allow some growth for runtime-generated textures, but not unbounded
    const maxAllowedGrowth = 20;
    return (finalCount - initialCount) < maxAllowedGrowth;
  }
);

const testConsecutiveTransitions = test(
  {
    given: 'Player in a level',
    when: 'Performing 3 consecutive transitions',
    then: 'All transitions complete without errors'
  },
  async (page) => {
    const levels = [
      { level: 'test/test-loading-complex', col: 2, row: 4 },
      { level: 'test/test-loading-simple', col: 2, row: 2 },
      { level: 'test/test-loading-complex', col: 2, row: 4 }
    ];

    for (const target of levels) {
      const success = await page.evaluate((t) => {
        return new Promise((resolve) => {
          const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          gameScene.startLevelTransition(t.level, t.col, t.row);
          const check = setInterval(() => {
            const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
            if (scene && scene.scene.isActive() && scene.entityManager && scene.entityManager.getFirst('player')) {
              clearInterval(check);
              clearTimeout(timeout);
              resolve(true);
            }
          }, 200);
          const timeout = setTimeout(() => { clearInterval(check); resolve(false); }, 15000);
        });
      }, target);

      if (!success) return false;
    }

    // Verify final state is clean
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      if (!player) return false;
      const children = scene.children.list;
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') return false;
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
    testTextureCountDoesNotGrowAfterTransition,
    testConsecutiveTransitions
  ],
  screenshotPath: 'tmp/test/screenshots/test-memory-management.png'
});
