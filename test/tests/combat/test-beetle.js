import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const PUNCH_DAMAGE = 20;

async function waitForReady(page) {
  await page.waitForFunction(() => {
    const scene = window.game?.scene?.scenes?.find(s => s.scene.key === 'game');
    if (!scene?.entityManager) return false;
    return !!scene.entityManager.getFirst('player');
  }, { timeout: 15000 });

  await page.evaluate(() => {
    enableRemoteInput();
    setFlag('canPunch', 'true');
  });
  await page.evaluate(() => waitForFlagSync());
  await new Promise(r => setTimeout(r, 500));
}

const testBeetleTakesDamage = test(
  {
    given: 'Player with canPunch and beetle 1 cell below',
    when: 'Player punches toward beetle',
    then: 'Beetle takes 20 damage'
  },
  async (page) => {
    await waitForReady(page);

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      transform.x = 5 * 64 + 32;
      transform.y = 6 * 64 + 32;
      // Also freeze beetle position
      const enemies = scene.entityManager.getAll().filter(e => e.tags.has('beetle'));
      if (enemies.length > 0) {
        const t = enemies[0].get(window.TransformComponent);
        t.x = 5 * 64 + 32;
        t.y = 7 * 64 + 32;
      }
    });
    await new Promise(r => setTimeout(r, 100));

    const healthBefore = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const enemies = scene.entityManager.getAll().filter(e => e.tags.has('beetle'));
      return enemies.length > 0 ? enemies[0].get(window.HealthComponent).getHealth() : -1;
    });

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 600));

    const healthAfter = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const enemies = scene.entityManager.getAll().filter(e => e.tags.has('beetle'));
      return enemies.length > 0 ? enemies[0].get(window.HealthComponent).getHealth() : -1;
    });

    console.log('  Health:', healthBefore, '->', healthAfter);
    return healthBefore - healthAfter === PUNCH_DAMAGE;
  }
);

const testBeetleFlashesOnHit = test(
  {
    given: 'Medium beetle that survives a punch',
    when: 'Punch lands',
    then: 'Beetle sprite is tinted'
  },
  async (page) => {
    await waitForReady(page);

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      player.require(window.TransformComponent).x = 5 * 64 + 32;
      player.require(window.TransformComponent).y = 6 * 64 + 32;
      const enemies = scene.entityManager.getAll().filter(e => e.tags.has('beetle'));
      if (enemies.length > 0) {
        enemies[0].get(window.HealthComponent).setHealth(40);
        const t = enemies[0].get(window.TransformComponent);
        t.x = 5 * 64 + 32;
        t.y = 7 * 64 + 32;
      }
    });
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 300));

    const isTinted = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const sprites = scene.children.list.filter(c => c.texture && c.texture.key === 'beetle');
      if (sprites.length === 0) return false;
      return sprites[0].isTinted;
    });

    console.log('  isTinted:', isTinted);
    return isTinted === true;
  }
);

runTests({
  level: 'test/test-beetle',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testBeetleTakesDamage,
    testBeetleFlashesOnHit,
  ],
  screenshotPath: 'tmp/test/screenshots/test-beetle.png'
});
