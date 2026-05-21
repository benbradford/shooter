import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testFlagsSurviveLevelTransition = test(
  {
    given: 'canPunch flag is set to true',
    when: 'WorldState simulates a level transition (setCurrentLevel + setPlayerSpawnPosition)',
    then: 'canPunch flag is still true and CachedFlag reflects it'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setFlag('canPunch', 'true');
      ws.setFlag('canSwim', 'true');
      ws.setFlag('canPush', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagsBeforeTransition = await page.evaluate(() => {
      return {
        canPunch: isFlagTrue('canPunch'),
        canSwim: isFlagTrue('canSwim'),
        canPush: isFlagTrue('canPush')
      };
    });
    if (!flagsBeforeTransition.canPunch || !flagsBeforeTransition.canSwim || !flagsBeforeTransition.canPush) {
      return false;
    }

    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setCurrentLevel('test/test-combat');
      ws.setPlayerSpawnPosition(3, 3);
    });

    const flagsAfterTransition = await page.evaluate(() => {
      return {
        canPunch: isFlagTrue('canPunch'),
        canSwim: isFlagTrue('canSwim'),
        canPush: isFlagTrue('canPush')
      };
    });

    return flagsAfterTransition.canPunch && flagsAfterTransition.canSwim && flagsAfterTransition.canPush;
  }
);

const testCachedFlagSurvivesTransitionSimulation = test(
  {
    given: 'CachedFlag instance watches canPunch which is true',
    when: 'WorldState simulates transition (setCurrentLevel changes level)',
    then: 'CachedFlag.get() still returns true'
  },
  async (page) => {
    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setFlag('canPunch', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const cachedValueBefore = await page.evaluate(() => {
      const cf = new window.CachedFlag('canPunch');
      window.__testCF = cf;
      return cf.get();
    });
    if (!cachedValueBefore) return false;

    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setCurrentLevel('some/other-level');
      ws.setPlayerSpawnPosition(5, 5);
    });

    const cachedValueAfter = await page.evaluate(() => {
      const result = window.__testCF.get();
      window.__testCF.destroy();
      delete window.__testCF;
      return result;
    });

    return cachedValueAfter === true;
  }
);

const testFlagsLoadedFromSaveReflectInCachedFlag = test(
  {
    given: 'Game state is saved with canPunch=true then cleared',
    when: 'loadFromJSON restores the saved state',
    then: 'CachedFlag updates to reflect saved value'
  },
  async (page) => {
    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setFlag('canPunch', 'true');
      ws.setFlag('canSwim', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const savedJSON = await page.evaluate(() => {
      return window.WorldStateManager.getInstance().serializeToJSON();
    });

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

    const clearedValues = await page.evaluate(() => {
      const cf1 = new window.CachedFlag('canPunch');
      const cf2 = new window.CachedFlag('canSwim');
      window.__testFlags = [cf1, cf2];
      return { canPunch: cf1.get(), canSwim: cf2.get() };
    });
    if (clearedValues.canPunch || clearedValues.canSwim) return false;

    await page.evaluate((json) => {
      window.WorldStateManager.getInstance().loadFromJSON(json);
    }, savedJSON);
    await page.evaluate(() => waitForFlagSync());

    const restoredValues = await page.evaluate(() => {
      const [cf1, cf2] = window.__testFlags;
      const result = { canPunch: cf1.get(), canSwim: cf2.get() };
      cf1.destroy();
      cf2.destroy();
      delete window.__testFlags;
      return result;
    });

    return restoredValues.canPunch === true && restoredValues.canSwim === true;
  }
);

const testFlagsPersistThroughSerializeAndReload = test(
  {
    given: 'Flags set during gameplay',
    when: 'State is serialized and reloaded via loadFromJSON',
    then: 'All flags persist and CachedFlag values match'
  },
  async (page) => {
    await page.evaluate(() => {
      const ws = window.WorldStateManager.getInstance();
      ws.setFlag('canPunch', 'true');
      ws.setFlag('canSwim', 'true');
      ws.setFlag('canPush', 'true');
      ws.setFlag('questProgress', '3');
    });

    const serialized = await page.evaluate(() => {
      return window.WorldStateManager.getInstance().serializeToJSON();
    });

    await page.evaluate(() => {
      const fresh = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: {},
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(fresh));
    });
    await page.evaluate(() => waitForFlagSync());

    const allCleared = await page.evaluate(() => {
      return !isFlagTrue('canPunch') && !isFlagTrue('canSwim') && !isFlagTrue('canPush');
    });
    if (!allCleared) return false;

    await page.evaluate((json) => {
      window.WorldStateManager.getInstance().loadFromJSON(json);
    }, serialized);
    await page.evaluate(() => waitForFlagSync());

    const restored = await page.evaluate(() => {
      return {
        canPunch: isFlagTrue('canPunch'),
        canSwim: isFlagTrue('canSwim'),
        canPush: isFlagTrue('canPush'),
        questProgress: window.WorldStateManager.getInstance().getFlag('questProgress')
      };
    });

    return restored.canPunch && restored.canSwim && restored.canPush && restored.questProgress === '3';
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
    testFlagsSurviveLevelTransition,
    testCachedFlagSurvivesTransitionSimulation,
    testFlagsLoadedFromSaveReflectInCachedFlag,
    testFlagsPersistThroughSerializeAndReload
  ],
  screenshotPath: 'tmp/test/screenshots/test-flag-persistence.png'
});
