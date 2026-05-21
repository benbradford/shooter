import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testNoMushroomsAfterRoundTrip = test(
  {
    given: 'grass_overworld1 loaded',
    when: 'transitioning to wilds1 and back',
    then: 'no mushroom sprites should appear'
  },
  async (page) => {
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

    const initialCount = await countMushrooms();
    console.log('[INFO] Initial mushroom count:', initialCount);

    await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const transform = player.get(window.TransformComponent);

      const exit = gameScene.entityManager.getAll().find(e =>
        e.id.startsWith('exit') && e.get(window.LevelExitComponent)
      );

      if (exit) {
        const exitTransform = exit.get(window.TransformComponent);
        transform.x = exitTransform.x;
        transform.y = exitTransform.y;
      }
    });

    await page.waitForTimeout(2000);

    const currentLevel1 = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      return gameScene.getLevelData().name;
    });
    console.log('[INFO] Current level:', currentLevel1);

    await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('game');
      const player = gameScene.entityManager.getFirst('player');
      const transform = player.get(window.TransformComponent);

      const exit = gameScene.entityManager.getAll().find(e =>
        e.id.startsWith('exit') && e.get(window.LevelExitComponent)
      );

      if (exit) {
        const exitTransform = exit.get(window.TransformComponent);
        transform.x = exitTransform.x;
        transform.y = exitTransform.y;
      }
    });

    await page.waitForTimeout(2000);

    const finalCount = await countMushrooms();
    console.log('[INFO] Final mushroom count:', finalCount);

    return finalCount === 0;
  }
);

runTests({
  level: 'grass_overworld1',
  commands: [],
  tests: [testNoMushroomsAfterRoundTrip],
  screenshotPath: 'test/screenshots/mushroom-persistence.png'
});
