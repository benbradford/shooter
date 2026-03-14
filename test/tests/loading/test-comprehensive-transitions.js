import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testMultipleTransitions = test(
  {
    given: 'Player in test-loading-simple',
    when: 'Performing 5 transitions between different levels',
    then: 'All transitions succeed with no crashes or missing textures'
  },
  async (page) => {
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    const transitions = [
      { level: 'test/test-loading-complex', col: 2, row: 4, name: 'complex' },
      { level: 'test/test-loading-simple', col: 2, row: 2, name: 'simple' },
      { level: 'test/test-loading-complex', col: 2, row: 4, name: 'complex' },
      { level: 'test/test-loading-simple', col: 2, row: 2, name: 'simple' },
      { level: 'test/test-loading-complex', col: 2, row: 4, name: 'complex' }
    ];

    for (let i = 0; i < transitions.length; i++) {
      const target = transitions[i];
      console.log(`\nTransition ${i+1}/5 to ${target.name}`);
      
      const success = await page.evaluate((t, index) => {
        return new Promise((resolve) => {
          const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          gameScene.startLevelTransition(t.level, t.col, t.row);
          
          let checks = 0;
          const check = setInterval(() => {
            checks++;
            const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
            if (scene && scene.scene.isActive() && scene.entityManager) {
              const player = scene.entityManager.getFirst('player');
              if (player) {
                const levelName = scene.getCurrentLevelName();
                if (levelName === t.level) {
                  clearInterval(check);
                  clearTimeout(timeout);
                  resolve(true);
                }
              }
            }
          }, 200);
          
          const timeout = setTimeout(() => { 
            clearInterval(check); 
            resolve(false); 
          }, 15000);
        });
      }, target, i);

      if (!success) {
        console.log(`❌ Transition ${i+1} FAILED`);
        return false;
      }
      console.log(`✓ Transition ${i+1} completed`);
    }

    // Final verification
    const finalCheck = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      if (!player) {
        console.log('[TEST] No player found');
        return false;
      }
      
      const children = scene.children.list;
      let missingCount = 0;
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          missingCount++;
        }
      }
      
      if (missingCount > 0) {
        console.log(`[TEST] Found ${missingCount} __MISSING textures`);
        return false;
      }
      
      console.log('[TEST] All clean! No missing textures');
      return true;
    });

    return finalCheck;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [testMultipleTransitions],
  screenshotPath: 'tmp/test/screenshots/test-comprehensive-transitions.png'
});
