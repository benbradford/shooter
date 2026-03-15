import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testDungeonGrassDungeon = test(
  {
    given: 'Starting in dungeon1',
    when: 'Transition to grass, then back to dungeon, wait 5 seconds',
    then: 'No crash occurs'
  },
  async (page) => {
    const logs = [];
    let crashed = false;
    let crashMessage = '';
    
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    page.on('pageerror', error => {
      crashed = true;
      crashMessage = error.message;
      console.log('💥 CRASH:', error.message);
    });
    
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        gameScene.startLevelTransition('grass_overworld1', 10, 10);
        
        const checkGrass = setInterval(() => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          if (scene && scene.scene.isActive() && scene.getCurrentLevelName() === 'grass_overworld1') {
            clearInterval(checkGrass);
            
            scene.startLevelTransition('dungeon1', 10, 10);
            
            const checkDungeon = setInterval(() => {
              const s = window.game.scene.scenes.find(sc => sc.scene.key === 'game');
              if (s && s.scene.isActive() && s.getCurrentLevelName() === 'dungeon1') {
                clearInterval(checkDungeon);
                
                let waitTime = 0;
                const waitInterval = setInterval(() => {
                  waitTime += 500;
                  
                  if (waitTime >= 5000) {
                    clearInterval(waitInterval);
                    clearTimeout(timeout);
                    const stillRunning = window.game && window.game.loop && window.game.loop.running;
                    resolve(stillRunning);
                  }
                }, 500);
              }
            }, 200);
          }
        }, 200);
        
        const timeout = setTimeout(() => {
          clearInterval(checkGrass);
          resolve(false);
        }, 20000);
      });
    });
    
    // Print relevant logs
    console.log('\n=== RELEVANT LOGS ===');
    logs.forEach(log => {
      if (log.includes('[DBGAME]') || log.includes('Filtered out enemy') || log.includes('skeleton')) {
        console.log(log);
      }
    });
    
    if (crashed) {
      console.log('\n💥 CRASH DETECTED:', crashMessage);
      return false;
    }
    
    return result;
  }
);

runTests({
  level: 'dungeon1',
  commands: ['test/interactions/player.js'],
  tests: [testDungeonGrassDungeon],
  screenshotPath: 'tmp/test/screenshots/test-dungeon-grass-dungeon.png'
});
