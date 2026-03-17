import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPetTeleports = test(
  {
    given: 'Pet at player position',
    when: 'Player teleports far away',
    then: 'Pet teleports to player'
  },
  async (page) => {
    // Teleport player far away
    const result = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const pet = gameScene.entityManager.getFirst('pet');
      
      const playerTransform = player.require(window.TransformComponent);
      const petTransform = pet.require(window.TransformComponent);
      
      const initialDistance = Math.hypot(playerTransform.x - petTransform.x, playerTransform.y - petTransform.y);
      
      // Teleport player 1000px away
      playerTransform.x += 1000;
      
      return { initialDistance };
    });
    
    console.log('Initial distance:', result.initialDistance);
    
    // Wait for pet to detect and teleport
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalResult = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const pet = gameScene.entityManager.getFirst('pet');
      
      const playerTransform = player.require(window.TransformComponent);
      const petTransform = pet.require(window.TransformComponent);
      
      const distance = Math.hypot(playerTransform.x - petTransform.x, playerTransform.y - petTransform.y);
      
      return { distance, ok: distance < 50 };
    });
    
    if (!finalResult.ok) {
      console.log(`❌ Pet didn't teleport: ${finalResult.distance}px away`);
      return false;
    }
    
    console.log(`✓ Pet teleported (distance: ${finalResult.distance.toFixed(0)}px)`);
    return true;
  }
);

await runTests({
  level: 'test_room1',
  commands: ['test/interactions/player.js'],
  tests: [testPetTeleports],
  screenshotPath: 'tmp/test/screenshots/test-pet-teleport.png'
});
