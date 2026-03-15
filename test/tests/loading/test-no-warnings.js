import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testNoReferenceWarnings = test(
  {
    given: 'Transitioning from dungeon1 to grass_overworld1',
    when: 'Checking console for warnings',
    then: 'No "Skipping unload" warnings appear'
  },
  async (page) => {
    const warnings = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Skipping unload') || text.includes('references')) {
        warnings.push(text);
        console.log('WARNING:', text);
      }
    });
    
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('grass_overworld1', 10, 10);
        
        const check = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.getCurrentLevelName() === 'grass_overworld1') {
            clearInterval(check);
            clearTimeout(timeout);
            resolve(true);
          }
        }, 200);
        
        const timeout = setTimeout(() => {
          clearInterval(check);
          resolve(false);
        }, 10000);
      });
    });
    
    console.log('\nTotal warnings:', warnings.length);
    return warnings.length === 0;
  }
);

runTests({
  level: 'dungeon1',
  commands: ['test/interactions/player.js'],
  tests: [testNoReferenceWarnings],
  screenshotPath: 'tmp/test/screenshots/test-no-warnings.png'
});
