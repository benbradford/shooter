const { test, runTests } = require('../../test-framework');

const tests = [
  test('grass_overworld1 → wilds1 → grass_overworld1 should not spawn mushrooms', async (page) => {
    // Count mushroom sprites
    const countMushrooms = () => page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      if (!gameScene) return 0;
      
      let count = 0;
      gameScene.children.list.forEach(child => {
        if (child.texture && child.texture.key === 'small_mushrooms') {
          count++;
        }
      });
      return count;
    });
    
    // Start in grass_overworld1
    const initialCount = await countMushrooms();
    console.log('Initial mushroom count:', initialCount);
    
    // Move to exit (assuming there's an exit to wilds1)
    await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const transform = player.get(window.TransformComponent);
      const grid = gameScene.getGrid();
      
      // Find exit to wilds1
      const exit = gameScene.entityManager.getAll().find(e => 
        e.id.startsWith('exit') && e.get(window.LevelExitComponent)
      );
      
      if (exit) {
        const exitTransform = exit.get(window.TransformComponent);
        transform.x = exitTransform.x;
        transform.y = exitTransform.y;
      }
    });
    
    await page.waitForTimeout(2000); // Wait for transition
    
    // Should be in wilds1 now
    const currentLevel1 = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      return gameScene.getLevelData().name;
    });
    console.log('Current level:', currentLevel1);
    
    // Go back to grass_overworld1
    await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const transform = player.get(window.TransformComponent);
      
      // Find exit back to grass_overworld1
      const exit = gameScene.entityManager.getAll().find(e => 
        e.id.startsWith('exit') && e.get(window.LevelExitComponent)
      );
      
      if (exit) {
        const exitTransform = exit.get(window.TransformComponent);
        transform.x = exitTransform.x;
        transform.y = exitTransform.y;
      }
    });
    
    await page.waitForTimeout(2000); // Wait for transition
    
    // Count mushrooms again
    const finalCount = await countMushrooms();
    console.log('Final mushroom count:', finalCount);
    
    return finalCount === 0;
  })
];

runTests('grass_overworld1', [], tests);
