import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPetSpawns = test(
  {
    given: 'World state with pet_rock_collected and pet_selected flags',
    when: 'Level loads',
    then: 'Pet entity spawns'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const petEntities = gameScene.entityManager.getByType('pet');
      
      if (petEntities.length === 0) {
        return { ok: false, reason: 'No pet entity' };
      }
      
      return { ok: true, petId: petEntities[0].id };
    });
    
    if (!result.ok) {
      console.log(`❌ ${result.reason}`);
      return false;
    }
    
    return true;
  }
);

const testPetFollows = test(
  {
    given: 'Pet at player position',
    when: 'Player moves',
    then: 'Pet follows within 200px'
  },
  async (page) => {
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(1, 0, true);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const pet = gameScene.entityManager.getFirst('pet');
      
      const playerTransform = player.require(window.TransformComponent);
      const petTransform = pet.require(window.TransformComponent);
      
      const distance = Math.hypot(playerTransform.x - petTransform.x, playerTransform.y - petTransform.y);
      
      return { distance, ok: distance < 200 };
    });
    
    if (!result.ok) {
      console.log(`❌ Pet too far: ${result.distance}px`);
      return false;
    }
    
    return true;
  }
);

await runTests({
  level: 'test_room1',
  commands: ['test/interactions/player.js'],
  tests: [testPetSpawns, testPetFollows],
  screenshotPath: 'tmp/test/screenshots/test-pet-basic.png'
});
