import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testTransitionDoesNotCrash = test(
  {
    given: 'Player in test-loading-simple level',
    when: 'Level transition is triggered',
    then: 'No crash occurs (game continues running)'
  },
  async (page) => {
    // Capture ALL console logs including errors
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        
        // Trigger transition
        console.log('[TEST] Triggering transition...');
        gameScene.startLevelTransition('test/test-loading-complex', 2, 4);
        
        // Check every 500ms for 10 seconds
        let checks = 0;
        const checkInterval = setInterval(() => {
          checks++;
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          const loadingScene = window.game.scene.scenes.find(s => s.scene.key === 'LoadingScene');
          
          console.log(`[TEST] Check ${checks}: GameScene active=${scene?.scene.isActive()}, LoadingScene active=${loadingScene?.scene.isActive()}`);
          
          if (scene && scene.scene.isActive() && scene.entityManager) {
            const player = scene.entityManager.getFirst('player');
            if (player) {
              const levelName = scene.getCurrentLevelName();
              console.log(`[TEST] Success! Level: ${levelName}`);
              clearInterval(checkInterval);
              resolve(levelName === 'test/test-loading-complex');
            }
          }
          
          if (checks >= 20) {
            console.log('[TEST] Timeout after 10 seconds');
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 500);
      });
    });
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [testTransitionDoesNotCrash],
  screenshotPath: 'tmp/test/screenshots/test-transition-crash.png'
});
