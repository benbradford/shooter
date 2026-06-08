import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testFlySurvivesSwoopHit = test(
  {
    given: 'Player standing at fly position (not punching, no pet)',
    when: 'The fly swoops and hits the player',
    then: 'The fly survives and returns to patrol'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game?.scene?.scenes?.find(s => s.scene.key === 'game');
      return scene?.entityManager?.getFirst('player');
    }, { timeout: 15000 });

    await page.evaluate(() => {
      enableRemoteInput();
      // Clear pet and punch flags so nothing auto-kills the fly
      setFlag('pet_selected', '');
      setFlag('pet_rock_collected', '');
      setFlag('canPunch', 'true');
    });
    await new Promise(r => setTimeout(r, 500));

    // Check fly exists
    const flyBefore = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const flies = scene.entityManager.getAll().filter(e => e.tags.has('fly'));
      return flies.length;
    });
    console.log('  Flies before:', flyBefore);
    if (flyBefore === 0) {
      console.log('  FAIL: No fly spawned (check if destroyed by pet on load)');
      return false;
    }

    // Move player on top of fly to trigger detection
    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      player.require(window.TransformComponent).x = 7 * 64 + 32;
      player.require(window.TransformComponent).y = 5 * 64 + 32;
    });

    // Wait for swoop cycle to complete
    await new Promise(r => setTimeout(r, 6000));

    const flyAfter = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const flies = scene.entityManager.getAll().filter(e => e.tags.has('fly'));
      return flies.length > 0 && !flies[0].isDestroyed;
    });
    console.log('  Fly alive after swoop:', flyAfter);
    return flyAfter;
  }
);

runTests({
  level: 'test/test-fly',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js',
  ],
  tests: [testFlySurvivesSwoopHit]
});
