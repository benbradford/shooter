import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testDisabledWhilePunching = test(
  {
    given: 'Pet active',
    when: 'Player punches and presses H',
    then: 'Pet ability does not activate'
  },
  async (page) => {
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[PET]')) {
        logs.push(text);
      }
    });
    
    await page.keyboard.press('Space');
    await new Promise(resolve => setTimeout(resolve, 50));
    await page.keyboard.press('h');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const found = logs.some(log => log.includes('ability activated'));
    
    if (found) {
      console.log(`❌ Ability activated while punching`);
      return false;
    }
    
    console.log(`✓ Ability correctly disabled while punching`);
    return true;
  }
);

const testDisabledWhenTooFar = test(
  {
    given: 'Pet active',
    when: 'Player moves far away (>250px) and presses H',
    then: 'Pet ability does not activate'
  },
  async (page) => {
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[PET]')) {
        logs.push(text);
      }
    });
    
    // Move player far away
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(1, 0, true);
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });
    
    // Try ability immediately (pet hasn't caught up)
    await page.keyboard.press('h');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const found = logs.some(log => log.includes('ability activated'));
    
    if (found) {
      console.log(`❌ Ability activated when pet too far`);
      return false;
    }
    
    console.log(`✓ Ability correctly disabled when pet too far`);
    return true;
  }
);

await runTests({
  level: 'test_room1',
  commands: ['test/interactions/player.js'],
  tests: [testDisabledWhilePunching, testDisabledWhenTooFar],
  screenshotPath: 'tmp/test/screenshots/test-pet-ability-disabled.png'
});
