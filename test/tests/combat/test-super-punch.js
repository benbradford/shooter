import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 10000 });
}

async function getEnemyHealth(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const enemies = scene.entityManager.getAll().filter(e => e.tags.has('enemy'));
    if (enemies.length === 0) return null;
    const health = enemies[0].get(window.HealthComponent);
    return health ? health.getHealth() : null;
  });
}

async function resetEnemyHealth(page) {
  await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const enemies = scene.entityManager.getAll().filter(e => e.tags.has('enemy'));
    if (enemies.length === 0) return;
    const health = enemies[0].get(window.HealthComponent);
    if (health) health.setHealth(70);
  });
}

const testSuperPunchHigherDamage = test(
  {
    given: 'Player with hasSuperPunch=true and enemy below',
    when: 'Player holds attack for >1000ms then releases',
    then: 'Enemy takes 60 damage (3x normal 20)'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('hasSuperPunch', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const healthBefore = await getEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => chargeSuperPunch(0, 1, 1200));

    const healthAfter = await getEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken === 60;
  }
);

const testEarlyReleaseNormalPunch = test(
  {
    given: 'Player with hasSuperPunch=true and enemy below',
    when: 'Player taps attack briefly (releases before 1000ms)',
    then: 'Enemy takes 20 damage (normal punch)'
  },
  async (page) => {
    await waitForPlayer(page);
    await resetEnemyHealth(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('hasSuperPunch', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const healthBefore = await getEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => punchAndWait(0, 1, 600));

    const healthAfter = await getEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken === 20;
  }
);

const testNoChargeWithoutFlag = test(
  {
    given: 'Player without hasSuperPunch flag and enemy below',
    when: 'Player holds attack for >1000ms then releases',
    then: 'Enemy takes only 20 damage (normal punch, no charge)'
  },
  async (page) => {
    await waitForPlayer(page);
    await resetEnemyHealth(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('hasSuperPunch', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    const healthBefore = await getEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => chargeSuperPunch(0, 1, 1200));

    const healthAfter = await getEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken === 20;
  }
);

runTests({
  level: 'test/test-super-punch',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testSuperPunchHigherDamage,
    testEarlyReleaseNormalPunch,
    testNoChargeWithoutFlag
  ],
  screenshotPath: 'tmp/test/screenshots/test-super-punch.png'
});
