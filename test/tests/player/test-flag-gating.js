import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testCanPunchEnabled = test(
  {
    given: 'canPunch flag is true',
    when: 'Player attempts to punch',
    then: 'Punch executes successfully'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPunch', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === true;
  }
);

const testCanPunchDisabled = test(
  {
    given: 'canPunch flag is false',
    when: 'Player attempts to punch',
    then: 'Punch is blocked'
  },
  async (page) => {
    await page.evaluate(() => waitForPunchComplete(2000));

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPunch', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === false;
  }
);

const testCanPushEnabled = test(
  {
    given: 'canPush flag is true',
    when: 'CachedFlag for canPush is queried',
    then: 'Returns true allowing push state entry'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPush', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canPush');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === true;
  }
);

const testCanPushDisabled = test(
  {
    given: 'canPush flag is false',
    when: 'CachedFlag for canPush is queried',
    then: 'Returns false preventing push state entry'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPush', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canPush');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === false;
  }
);

const testCanJumpEnabled = test(
  {
    given: 'canJump flag is true',
    when: 'CachedFlag for canJump is queried',
    then: 'Returns true allowing jump detection'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canJump', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canJump');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === true;
  }
);

const testCanJumpDisabled = test(
  {
    given: 'canJump flag is false',
    when: 'CachedFlag for canJump is queried',
    then: 'Returns false preventing jump execution'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canJump', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canJump');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === false;
  }
);

const testCanSwimEnabled = test(
  {
    given: 'canSwim flag is true',
    when: 'CachedFlag for canSwim is queried',
    then: 'Returns true allowing water entry'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canSwim', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canSwim');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === true;
  }
);

const testCanSwimDisabled = test(
  {
    given: 'canSwim flag is false',
    when: 'CachedFlag for canSwim is queried',
    then: 'Returns false blocking water entry'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canSwim', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    const flagValue = await page.evaluate(() => {
      const flag = new window.CachedFlag('canSwim');
      const value = flag.get();
      flag.destroy();
      return value;
    });
    return flagValue === false;
  }
);

const testFlagTogglePunchOnOff = test(
  {
    given: 'canPunch starts enabled then gets disabled',
    when: 'Player punches before and after flag change',
    then: 'Punch works when enabled, blocked when disabled'
  },
  async (page) => {
    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPunch', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchedFirst = await page.evaluate(() => isPunching());
    if (!punchedFirst) return false;

    await page.evaluate(() => waitForPunchComplete(2000));

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canPunch', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchedSecond = await page.evaluate(() => isPunching());
    return punchedSecond === false;
  }
);

const testAllFlagsLoadFromJSON = test(
  {
    given: 'All ability flags cleared',
    when: 'loadFromJSON sets all four flags to true',
    then: 'All CachedFlag instances reflect enabled state'
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

    const allFalse = await page.evaluate(() => {
      const flags = ['canPunch', 'canPush', 'canJump', 'canSwim'];
      return flags.every(name => {
        const f = new window.CachedFlag(name);
        const val = f.get();
        f.destroy();
        return val === false;
      });
    });
    if (!allFalse) return false;

    await page.evaluate(() => {
      const state = {
        timePlayed: 0,
        player: { health: 100, coins: 0, currentLevel: 'test/test-combat', entryCell: { col: 5, row: 5 } },
        flags: { canPunch: 'true', canPush: 'true', canJump: 'true', canSwim: 'true' },
        levels: {}
      };
      window.WorldStateManager.getInstance().loadFromJSON(JSON.stringify(state));
    });
    await page.evaluate(() => waitForFlagSync());

    const allTrue = await page.evaluate(() => {
      const flags = ['canPunch', 'canPush', 'canJump', 'canSwim'];
      return flags.every(name => {
        const f = new window.CachedFlag(name);
        const val = f.get();
        f.destroy();
        return val === true;
      });
    });
    return allTrue === true;
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
    testCanPunchEnabled,
    testCanPunchDisabled,
    testCanPushEnabled,
    testCanPushDisabled,
    testCanJumpEnabled,
    testCanJumpDisabled,
    testCanSwimEnabled,
    testCanSwimDisabled,
    testFlagTogglePunchOnOff,
    testAllFlagsLoadFromJSON
  ],
  screenshotPath: 'tmp/test/screenshots/test-flag-gating.png'
});
