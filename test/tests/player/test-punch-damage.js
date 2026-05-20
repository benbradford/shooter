import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const PUNCH_DAMAGE = 20;
const SKELETON_MEDIUM_HEALTH = 30;
const RISE_DURATION_MS = 1200;
const PUNCH_COMPLETE_MS = 700;

const testPunchDamagesEnemyInRange = test(
  {
    given: 'a stationary enemy within punch range',
    when: 'Player punches toward the enemy',
    then: 'Enemy takes punch damage'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    await new Promise(r => setTimeout(r, RISE_DURATION_MS));

    const initialHealth = await page.evaluate(() => {
      const enemies = getAllEnemies();
      return enemies.length > 0 ? enemies[0].health : null;
    });

    if (initialHealth === null) return false;

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, PUNCH_COMPLETE_MS));

    const healthAfter = await page.evaluate(() => {
      const enemies = getAllEnemies();
      return enemies.length > 0 ? enemies[0].health : null;
    });

    if (healthAfter === null) return initialHealth - PUNCH_DAMAGE <= 0;
    return healthAfter === initialHealth - PUNCH_DAMAGE;
  }
);

const testNoDamageFromOutOfRange = test(
  {
    given: 'a stationary enemy far from punch range',
    when: 'Player punches away from the enemy',
    then: 'Enemy takes no damage'
  },
  async (page) => {
    const initialHealth = await page.evaluate(() => {
      const enemies = getAllEnemies();
      return enemies.length > 0 ? enemies[0].health : null;
    });

    if (initialHealth === null) return false;

    await page.evaluate(() => punch(0, -1));
    await new Promise(r => setTimeout(r, PUNCH_COMPLETE_MS));

    const healthAfter = await page.evaluate(() => {
      const enemies = getAllEnemies();
      return enemies.length > 0 ? enemies[0].health : null;
    });

    return healthAfter === initialHealth;
  }
);

const testEnemyDestroyedAfterEnoughHits = test(
  {
    given: 'a medium-difficulty enemy',
    when: 'Player lands enough punches to deplete its health',
    then: 'Enemy is destroyed'
  },
  async (page) => {
    const hitsNeeded = Math.ceil(SKELETON_MEDIUM_HEALTH / PUNCH_DAMAGE);

    const enemyCountBefore = await page.evaluate(() => getEnemyCount());
    if (enemyCountBefore === 0) return false;

    for (let i = 0; i < hitsNeeded; i++) {
      await page.evaluate(() => punch(0, 1));
      await new Promise(r => setTimeout(r, PUNCH_COMPLETE_MS));
    }

    await new Promise(r => setTimeout(r, 500));

    const enemyCountAfter = await page.evaluate(() => getEnemyCount());
    return enemyCountAfter === 0;
  }
);

runTests({
  level: 'test/test-punch-damage',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testPunchDamagesEnemyInRange,
    testNoDamageFromOutOfRange,
    testEnemyDestroyedAfterEnoughHits
  ],
  screenshotPath: 'tmp/test/screenshots/test-punch-damage.png'
});
