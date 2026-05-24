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
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const PetAbilityComp = window.PetAbilityComponent;
      const petAbility = player.get(PetAbilityComp);

      if (!petAbility) {
        return { ok: false, reason: 'No PetAbilityComponent' };
      }

      const canUse = petAbility.canUseAbility();
      const activated = petAbility.tryAbility();

      return { ok: canUse && activated, canUse, activated };
    });

    if (!result.ok) {
      console.log(`❌ Ability didn't activate. canUse=${result.canUse}, activated=${result.activated}`);
      return false;
    }
    return true;
  }
);

await runTests({
  level: 'test/test_room1',
  commands: [],
  tests: [testPetAbility],
  screenshotPath: 'tmp/test/screenshots/test-pet-ability.png'
});
