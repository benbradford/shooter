import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testRealLevelTransitions = test(
  {
    given: 'Player in grass_overworld1',
    when: 'Transitioning between real game levels',
    then: 'All transitions succeed'
  },
  async (page) => {
    // Set up logging BEFORE evaluate
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    const transitions = [
      { level: 'house3_interior', col: 10, row: 5 },  // Not on exit trigger
      { level: 'grass_overworld1', col: 10, row: 10 },
      { level: 'house3_interior', col: 10, row: 5 }
    ];

    for (let i = 0; i < transitions.length; i++) {
      const target = transitions[i];
      console.log(`\nTransition ${i+1}/3 to ${target.level}`);
      
      const success = await page.evaluate((t) => {
        return new Promise((resolve) => {
          const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          console.log(`[TEST] Current level:`, gameScene.getCurrentLevelName());
          gameScene.startLevelTransition(t.level, t.col, t.row);
          
          let checks = 0;
          const check = setInterval(() => {
            checks++;
            const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
            if (scene && scene.scene.isActive() && scene.entityManager) {
              const player = scene.entityManager.getFirst('player');
              if (player) {
                const levelName = scene.getCurrentLevelName();
                console.log(`[TEST] Check ${checks}: level is ${levelName}, want ${t.level}`);
                if (levelName === t.level) {
                  clearInterval(check);
                  clearTimeout(timeout);
                  resolve(true);
                }
              } else {
                console.log(`[TEST] Check ${checks}: no player`);
              }
            } else {
              console.log(`[TEST] Check ${checks}: scene not ready`);
            }
          }, 200);
          
          const timeout = setTimeout(() => { 
            console.log(`[TEST] TIMEOUT`);
            clearInterval(check); 
            resolve(false); 
          }, 15000);
        });
      }, target);

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
      if (!player) return false;
      
      const children = scene.children.list;
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          console.log('[TEST] Found __MISSING texture');
          return false;
        }
      }
      return true;
    });

    return finalCheck;
  }
);

runTests({
  level: 'grass_overworld1',
  commands: ['test/interactions/player.js'],
  tests: [testRealLevelTransitions],
  screenshotPath: 'tmp/test/screenshots/test-real-transitions.png'
});
