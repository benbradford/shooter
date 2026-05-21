import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testCachedFlagsRevokedByLoad = test(
  {
    given: 'Game loaded with canPunch possibly true from saved state',
    when: 'loadFromJSON clears all flags',
    then: 'CachedFlag updates and punch is blocked'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: {},
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === false;
  }
);

const testLoadFromJSONNotifiesCachedFlags = test(
  {
    given: 'CachedFlag canPunch is false after cleared state',
    when: 'loadFromJSON loads state with canPunch=true',
    then: 'CachedFlag updates and punch works without explicit setFlag'
  },
  async (page) => {
    await page.evaluate(() => {
      const cleared = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: {},
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(cleared));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const blockedBefore = await page.evaluate(() => !isPunching());
    if (!blockedBefore) return false;

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'true', canSwim: 'true', canPush: 'true' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchingAfter = await page.evaluate(() => isPunching());
    return punchingAfter === true;
  }
);

const testLoadFromJSONUpdatesMultipleFlags = test(
  {
    given: 'All ability flags cleared by loadFromJSON',
    when: 'loadFromJSON sets canPunch and canSwim to true',
    then: 'Both CachedFlag instances reflect loaded values'
  },
  async (page) => {
    await page.evaluate(() => waitForPunchComplete(2000));

    await page.evaluate(() => {
      const cleared = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: {},
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(cleared));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'true', canSwim: 'true' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    const canPunch = await page.evaluate(() => isFlagTrue('canPunch'));
    const canSwim = await page.evaluate(() => isFlagTrue('canSwim'));
    if (!canPunch || !canSwim) return false;

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === true;
  }
);

const testLoadFromFileRegressionGuard = test(
  {
    given: 'CachedFlag instances exist for canPunch, canSwim, canPush',
    when: 'loadFromJSON simulates loading saved state with all flags true',
    then: 'Every CachedFlag.get() returns true without explicit setFlag calls'
  },
  async (page) => {
    await page.evaluate(() => {
      const cleared = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: {},
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(cleared));
    });
    await page.evaluate(() => waitForFlagSync());

    const allFalse = await page.evaluate(() => {
      const cf1 = new window.CachedFlag('canPunch');
      const cf2 = new window.CachedFlag('canSwim');
      const cf3 = new window.CachedFlag('canPush');
      window.__testFlags = [cf1, cf2, cf3];
      return !cf1.get() && !cf2.get() && !cf3.get();
    });
    if (!allFalse) return false;

    await page.evaluate(() => {
      const savedState = {
        timePlayed: 120,
        player: { health: 80, coins: 5, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'true', canSwim: 'true', canPush: 'true' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(savedState));
    });
    await page.evaluate(() => waitForFlagSync());

    const allTrue = await page.evaluate(() => {
      const [cf1, cf2, cf3] = window.__testFlags;
      const result = cf1.get() && cf2.get() && cf3.get();
      cf1.destroy();
      cf2.destroy();
      cf3.destroy();
      delete window.__testFlags;
      return result;
    });
    return allTrue === true;
  }
);

const testLoadFromJSONCanRevokeFlags = test(
  {
    given: 'canPunch was true from prior loadFromJSON',
    when: 'loadFromJSON loads state with canPunch=false',
    then: 'CachedFlag reverts and punch is blocked again'
  },
  async (page) => {
    await page.evaluate(() => waitForPunchComplete(2000));

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'true' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchWorks = await page.evaluate(() => isPunching());
    if (!punchWorks) return false;

    await page.evaluate(() => waitForPunchComplete(2000));

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'false' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchBlocked = await page.evaluate(() => !isPunching());
    return punchBlocked === true;
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
    testCachedFlagsRevokedByLoad,
    testLoadFromJSONNotifiesCachedFlags,
    testLoadFromJSONUpdatesMultipleFlags,
    testLoadFromFileRegressionGuard,
    testLoadFromJSONCanRevokeFlags
  ],
  screenshotPath: 'tmp/test/screenshots/test-cached-flag-load.png'
});
