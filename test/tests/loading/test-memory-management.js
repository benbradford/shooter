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
    page.on('console', msg => {
      if (msg.text().includes('[TEST]') || msg.text().includes('ERROR')) {
        console.log('BROWSER:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    const levels = [
      { level: 'test/test-loading-complex', col: 2, row: 4 },
      { level: 'test/test-loading-simple', col: 2, row: 2 },
      { level: 'test/test-loading-complex', col: 2, row: 4 }
    ];

    for (let i = 0; i < levels.length; i++) {
      const target = levels[i];
      console.log(`\n[TEST] Starting transition ${i+1}/3 to ${target.level}`);
      
      const success = await page.evaluate((t, index) => {
        return new Promise((resolve) => {
          console.log(`[TEST] Transition ${index+1}: Starting to ${t.level}`);
          const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          gameScene.startLevelTransition(t.level, t.col, t.row);
          
          let checks = 0;
          const check = setInterval(() => {
            checks++;
            const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
            if (scene && scene.scene.isActive() && scene.entityManager && scene.entityManager.getFirst('player')) {
              console.log(`[TEST] Transition ${index+1}: Success after ${checks} checks`);
              clearInterval(check);
              clearTimeout(timeout);
              resolve(true);
            }
            if (checks % 10 === 0) {
              console.log(`[TEST] Transition ${index+1}: Still waiting... (${checks} checks)`);
            }
          }, 200);
          const timeout = setTimeout(() => { 
            console.log(`[TEST] Transition ${index+1}: TIMEOUT`);
            clearInterval(check); 
            resolve(false); 
          }, 15000);
        });
      }, target, i);

      if (!success) {
        console.log(`[TEST] Transition ${i+1} FAILED`);
        return false;
      }
      console.log(`[TEST] Transition ${i+1} completed successfully`);
    }

    // Verify final state is clean
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      console.log('[TEST] Final verification: scene exists:', !!scene);
      
      if (!scene) return false;
      
      const player = scene.entityManager.getFirst('player');
      console.log('[TEST] Final verification: player exists:', !!player);
      
      if (!player) return false;
      
      const children = scene.children.list;
      console.log('[TEST] Final verification: checking', children.length, 'children');
      
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          console.log('[TEST] Final verification: Found __MISSING texture at', child.x, child.y, 'depth', child.depth, 'type', child.type);
          return false;
        }
      }
      
      console.log('[TEST] Final verification: All clean!');
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
