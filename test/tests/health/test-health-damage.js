import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const DEATH_ANIM_DURATION_MS = 1000;
const FADE_DURATION_MS = 1000;
const REGEN_DELAY_MS = 3000;

const testHealthDecreasesOnDamage = test(
  {
    given: 'player at full health',
    when: 'player takes damage via setPlayerHealth',
    then: 'health decreases'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    const maxHealth = await page.evaluate(() => getPlayerMaxHealth());
    const initialHealth = await page.evaluate(() => getPlayerHealth());

    if (initialHealth === null || maxHealth === null) return false;

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const health = player.get(window.HealthComponent);
      health.takeDamage(30);
    });

    const healthAfter = await page.evaluate(() => getPlayerHealth());
    return healthAfter === initialHealth - 30;
  }
);

const testDeathStateAtZeroHealth = test(
  {
    given: 'player health is low',
    when: 'enough damage is taken to reach 0',
    then: 'player enters death state'
  },
  async (page) => {
    await page.evaluate(() => setPlayerHealth(10));
    await new Promise(r => setTimeout(r, 100));

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const health = player.get(window.HealthComponent);
      health.takeDamage(20);
    });

    await new Promise(r => setTimeout(r, 200));

    const state = await page.evaluate(() => getPlayerState());
    return state === 'death';
  }
);

const testHealthRegenOverTime = test(
  {
    given: 'player health is below max and hasAutoHeal is true',
    when: 'enough time passes',
    then: 'health regenerates'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 15000 });

    await page.evaluate(() => setFlag('hasAutoHeal', 'true'));
    await page.evaluate(() => waitForFlagSync());
    await new Promise(r => setTimeout(r, 100));

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const health = player.get(window.HealthComponent);
      health.refreshAutoHeal();
      health.takeDamage(health.getHealth() - 50);
    });

    const healthBefore = await page.evaluate(() => getPlayerHealth());

    await new Promise(r => setTimeout(r, REGEN_DELAY_MS + 2000));

    const healthAfter = await page.evaluate(() => getPlayerHealth());
    return healthAfter > healthBefore;
  }
);

const testDeathAnimationNoCrash = test(
  {
    given: 'player is in death state',
    when: 'death animation completes',
    then: 'game handles death without crashing'
  },
  async (page) => {
    await page.evaluate(() => setPlayerHealth(1));
    await new Promise(r => setTimeout(r, 100));

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const health = player.get(window.HealthComponent);
      health.takeDamage(10);
    });

    await new Promise(r => setTimeout(r, DEATH_ANIM_DURATION_MS + FADE_DURATION_MS + 500));

    const noErrors = await page.evaluate(() => {
      return window.game && window.game.scene.scenes.length > 0;
    });
    return noErrors === true;
  }
);

runTests({
  level: 'test/test-combat',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testHealthDecreasesOnDamage,
    testHealthRegenOverTime,
    testDeathStateAtZeroHealth,
    testDeathAnimationNoCrash
  ],
  screenshotPath: 'tmp/test/screenshots/test-health-damage.png'
});
