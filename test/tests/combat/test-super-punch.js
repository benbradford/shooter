import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const RISE_DURATION_MS = 1200;
const SKELETON_HARD_HEALTH = 70;
const PUNCH_DAMAGE = 20;
const SUPER_PUNCH_DAMAGE = 60;
const PUNCH_COMPLETE_MS = 700;

async function waitForReady(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 10000 });
  await page.evaluate(() => setFlag('canPunch', 'true'));
  await page.evaluate(() => waitForFlagSync());
  await new Promise(r => setTimeout(r, RISE_DURATION_MS));
}

async function getFirstEnemyHealth(page) {
  return page.evaluate(() => {
    const enemies = getAllEnemies();
    return enemies.length > 0 ? enemies[0].health : null;
  });
}

async function resetEnemy(page) {
  await page.evaluate((maxHealth) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const playerTransform = player.require(window.TransformComponent);
    playerTransform.x = 5 * 64 + 32;
    playerTransform.y = 5 * 64 + 32;

    const enemies = scene.entityManager.getAll().filter(e => e.tags.has('enemy'));
    if (enemies.length === 0) return;
    const health = enemies[0].get(window.HealthComponent);
    if (health) health.setHealth(maxHealth);
    const transform = enemies[0].get(window.TransformComponent);
    if (transform) {
      transform.x = 5 * 64 + 32;
      transform.y = 6 * 64 + 32;
    }
  }, SKELETON_HARD_HEALTH);
  await new Promise(r => setTimeout(r, 200));
}

const testSuperPunchHigherDamage = test(
  {
    given: 'Player with hasSuperPunch=true and enemy one cell below',
    when: 'Player holds attack for >1000ms then releases',
    then: 'Enemy takes 60 damage (3x normal)'
  },
  async (page) => {
    await waitForReady(page);
    await page.evaluate(() => setFlag('hasSuperPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    const healthBefore = await getFirstEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => chargeSuperPunch(0, 1, 1200));

    const healthAfter = await getFirstEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken === SUPER_PUNCH_DAMAGE;
  }
);

const testEarlyReleaseNormalPunch = test(
  {
    given: 'Player with hasSuperPunch=true and enemy one cell below',
    when: 'Player taps attack briefly (quick punch, no charge)',
    then: 'Enemy takes 20 damage (normal punch)'
  },
  async (page) => {
    await waitForReady(page);
    await page.evaluate(() => setFlag('hasSuperPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());
    await resetEnemy(page);

    const healthBefore = await getFirstEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, PUNCH_COMPLETE_MS));

    const healthAfter = await getFirstEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken === PUNCH_DAMAGE;
  }
);

const testNoChargeWithoutFlag = test(
  {
    given: 'Player without hasSuperPunch flag and enemy one cell below',
    when: 'Player holds attack for >1000ms then releases',
    then: 'Enemy takes only normal punch damage after release'
  },
  async (page) => {
    await waitForReady(page);
    await page.evaluate(() => setFlag('hasSuperPunch', 'false'));
    await page.evaluate(() => waitForFlagSync());
    await resetEnemy(page);

    const healthBefore = await getFirstEnemyHealth(page);
    if (healthBefore === null) return false;

    await page.evaluate(() => chargeSuperPunch(0, 1, 1200));

    const healthAfter = await getFirstEnemyHealth(page);
    if (healthAfter === null) return false;

    const damageTaken = healthBefore - healthAfter;
    return damageTaken < SUPER_PUNCH_DAMAGE;
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
