import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testEntitiesPersist = test(
  {
    given: 'Level with 3 breakables',
    when: 'Leaving and returning to the level',
    then: 'Breakables still exist'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        const initialCount = gameScene.entityManager.getByType('breakable').length;
        console.log('[TEST] Initial breakables:', initialCount);
        
        // Transition away
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);
        
        // Wait for first transition
        const checkAway = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.getCurrentLevelName() === 'test/test-loading-simple') {
            clearInterval(checkAway);
            console.log('[TEST] Arrived at test-loading-simple');
            
            // Transition back
            scene.startLevelTransition('test/test-breakables', 3, 3);
            
            // Wait for return
            const checkBack = setInterval(() => {
              const s = window.game.scene.scenes.find(sc => sc.scene.key === 'game');
              if (s && s.scene.isActive() && s.getCurrentLevelName() === 'test/test-breakables') {
                clearInterval(checkBack);
                clearTimeout(timeout);
                
                const finalCount = s.entityManager.getByType('breakable').length;
                console.log('[TEST] Final breakables:', finalCount);
                console.log('[TEST] Match:', finalCount === initialCount);
                
                resolve(finalCount === initialCount);
              }
            }, 200);
          }
        }, 200);
        
        const timeout = setTimeout(() => {
          clearInterval(checkAway);
          resolve(false);
        }, 15000);
      });
    });
    return result;
  }
);

runTests({
  level: 'test/test-breakables',
  commands: ['test/interactions/player.js'],
  tests: [testEntitiesPersist],
  screenshotPath: 'tmp/test/screenshots/test-entities-persist.png'
});
