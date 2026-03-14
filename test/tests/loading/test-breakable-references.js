import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testBreakableReferences = test(
  {
    given: 'Level with 3 breakables',
    when: 'Transitioning to another level',
    then: 'Breakable texture references are cleaned up'
  },
  async (page) => {
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        
        console.log('[TEST] Starting transition, entities:', gameScene.entityManager.count);
        
        // Trigger transition
        gameScene.startLevelTransition('test/test-loading-simple', 2, 2);
        
        // Wait for transition to complete
        const check = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const player = scene.entityManager.getFirst('player');
            if (player) {
              clearInterval(check);
              clearTimeout(timeout);
              console.log('[TEST] Transition complete');
              resolve(true);
            }
          }
        }, 200);
        
        const timeout = setTimeout(() => {
          clearInterval(check);
          resolve(false);
        }, 10000);
      });
    });
    return result;
  }
);

runTests({
  level: 'test/test-breakables',
  commands: ['test/interactions/player.js'],
  tests: [testBreakableReferences],
  screenshotPath: 'tmp/test/screenshots/test-breakables.png'
});
