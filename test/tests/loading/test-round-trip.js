import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testDungeonGrassDungeonRoundTrip = test(
  {
    given: 'Starting in dungeon1',
    when: 'Transition to grass, then back to dungeon, wait 3 seconds',
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
    });
    
    // Step 1: Transition to grass
    await page.evaluate(() => {
      const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      gameScene.startLevelTransition('grass_overworld1', 35, 25);
    });
    
    // Wait for grass to load
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.scene.isActive() && scene.getCurrentLevelName() === 'grass_overworld1';
    }, { timeout: 10000 });
    
    console.log('✓ Step 1: Arrived at grass_overworld1');
    
    // Step 2: Transition back to dungeon
    await page.evaluate(() => {
      const gameScene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      gameScene.startLevelTransition('dungeon1', 10, 10);
    });
    
    console.log('✓ Triggered transition back to dungeon1');
    
    // Wait for dungeon to load (or timeout)
    try {
      await page.waitForFunction(() => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        return scene && scene.scene.isActive() && scene.getCurrentLevelName() === 'dungeon1';
      }, { timeout: 10000 });
      
      console.log('✓ Step 2: Back in dungeon1');
    } catch (error) {
      console.log('❌ Timeout waiting for dungeon1 to load');
      console.log('\n=== LOGS AT TIMEOUT ===');
      logs.slice(-30).forEach(log => {
        if (log.includes('[DBGAME]') || log.includes('ERROR') || log.includes('dungeon1')) {
          console.log(log);
        }
      });
      return false;
    }
    
    // Step 3: Wait 3 seconds for entities to update
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✓ Step 3: Waited 3 seconds');
    
    // Check if game is still running
    const stillRunning = await page.evaluate(() => {
      return window.game && window.game.loop && window.game.loop.running;
    });
    
    // Print filtered enemy textures
    console.log('\n=== FILTERED ENEMY TEXTURES ===');
    logs.forEach(log => {
      if (log.includes('Filtered out enemy')) {
        console.log(log);
      }
    });
    
    if (crashed) {
      console.log('\n💥 CRASH:', crashMessage);
      console.log('\n=== LAST 20 LOGS ===');
      logs.slice(-20).forEach(log => console.log(log));
      return false;
    }
    
    console.log('✓ No crash detected');
    return stillRunning;
  }
);

runTests({
  level: 'dungeon1',
  commands: ['test/interactions/player.js'],
  tests: [testDungeonGrassDungeonRoundTrip],
  screenshotPath: 'tmp/test/screenshots/test-round-trip.png'
});
