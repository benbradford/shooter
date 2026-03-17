import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPetAbility = test(
  {
    given: 'Pet within 250px',
    when: 'H pressed via evaluate',
    then: 'Ability activates'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const PetAbilityComp = window.PetAbilityComponent;
      const petAbility = player.get(PetAbilityComp);
      
      if (!petAbility) {
        console.log = originalLog;
        return { ok: false, reason: 'No PetAbilityComponent' };
      }
      
      const canUse = petAbility.canUseAbility();
      const result = petAbility.tryAbility();
      
      console.log = originalLog;
      
      const found = logs.some(log => log.includes('[PET]') && log.includes('ability activated'));
      
      return { ok: found, canUse, result, logs };
    });
    
    if (!result.ok) {
      console.log(`❌ Ability didn't activate. canUse=${result.canUse}, result=${result.result}`);
      console.log('Logs:', result.logs);
      return false;
    }
    
    console.log(`✓ Ability activated`);
    return true;
  }
);

await runTests({
  level: 'test_room1',
  commands: [],
  tests: [testPetAbility],
  screenshotPath: 'tmp/test/screenshots/test-pet-ability.png'
});
