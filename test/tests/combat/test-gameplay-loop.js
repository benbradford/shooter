import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const PUNCH_DAMAGE = 20;
const MEDIUM_SKELETON_HEALTH = 30;
const HITS_TO_KILL = Math.ceil(MEDIUM_SKELETON_HEALTH / PUNCH_DAMAGE);
const RISE_DURATION_MS = 1200;
const MOVEMENT_SETTLE_MS = 200;

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 10000 });
}

const testFullCombatLoop = test(
  {
    given: 'Player near a medium skeleton (30 HP, requires 2 hits)',
    when: 'Player moves into range and punches repeatedly until enemy dies',
    then: 'Enemy is destroyed, player survives, and game state is stable'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    await new Promise(r => setTimeout(r, RISE_DURATION_MS));

    const enemiesBefore = await page.evaluate(() => getEnemyCount());
    if (enemiesBefore === 0) return false;

    const playerHealthBefore = await page.evaluate(() => getPlayerHealth());
    if (playerHealthBefore === null || playerHealthBefore <= 0) return false;

    await page.evaluate(() => moveToRowHelper(4, 3000));
    await new Promise(r => setTimeout(r, MOVEMENT_SETTLE_MS));

    for (let i = 0; i < HITS_TO_KILL + 1; i++) {
      await page.evaluate(() => punchAndWait(0, 1, 600));
    }

    await new Promise(r => setTimeout(r, 500));

    const enemiesAfter = await page.evaluate(() => getEnemyCount());
    const playerAlive = await page.evaluate(() => !isPlayerDead());
    const state = await page.evaluate(() => getPlayerState());

    return enemiesAfter === 0 && playerAlive && state === 'idle';
  }
);

const testEnemyRetaliatesDuringFight = test(
  {
    given: 'Player in attack range of a medium skeleton',
    when: 'Player waits long enough for enemy to attempt an attack',
    then: 'Player takes damage (enemy AI attack system is functioning)'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    await new Promise(r => setTimeout(r, RISE_DURATION_MS));

    const healthBefore = await page.evaluate(() => getPlayerHealth());
    if (healthBefore === null) return false;

    await page.evaluate(() => setPlayerHealth(100));

    // Move adjacent to skeleton so we're within attack range
    await page.evaluate(() => moveToCellHelper(5, 4, 3000));
    await new Promise(r => setTimeout(r, MOVEMENT_SETTLE_MS));

    // Wait up to 8s for the enemy to land a hit (rise + idle + walk + attack cycle)
    const tookDamage = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startHealth = getPlayerHealth();
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 100;
          const currentHealth = getPlayerHealth();
          if (currentHealth < startHealth) {
            clearInterval(interval);
            resolve(true);
          } else if (elapsed >= 8000) {
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
      });
    });

    return tookDamage === true;
  }
);

const testRapidInputStability = test(
  {
    given: 'Player in combat with a medium skeleton',
    when: 'Rapid alternating movement and attack inputs are sent',
    then: 'Game does not crash, player entity still exists, state machine recovers'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    await new Promise(r => setTimeout(r, RISE_DURATION_MS));

    await page.evaluate(() => moveToRowHelper(4, 3000));
    await new Promise(r => setTimeout(r, MOVEMENT_SETTLE_MS));

    // Rapid interleaved movement + punches
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      await page.evaluate((d) => {
        const remoteInput = enableRemoteInput();
        remoteInput.setWalk(d, 0, true);
      }, dir);
      await new Promise(r => setTimeout(r, 100));
      await page.evaluate(() => punch(0, 1));
      await new Promise(r => setTimeout(r, 200));
      await page.evaluate(() => {
        const remoteInput = enableRemoteInput();
        remoteInput.setWalk(0, 0, false);
      });
    }

    await new Promise(r => setTimeout(r, 1000));

    const gameRunning = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player') !== null;
    });

    const state = await page.evaluate(() => getPlayerState());

    return gameRunning && (state === 'idle' || state === 'walk');
  }
);

runTests({
  level: 'test/test-gameplay-loop',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testEnemyRetaliatesDuringFight,
    testRapidInputStability,
    testFullCombatLoop
  ],
  screenshotPath: 'tmp/test/screenshots/test-gameplay-loop.png'
});
