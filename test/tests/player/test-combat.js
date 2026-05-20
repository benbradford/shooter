import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPunchWorksWhenCanPunchTrue = test(
  {
    given: 'canPunch flag is true',
    when: 'Player presses attack',
    then: 'Player enters punch state'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());
    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === true;
  }
);

const testPunchBlockedWhenCanPunchFalse = test(
  {
    given: 'canPunch flag is false',
    when: 'Player presses attack',
    then: 'Player does not enter punch state'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canPunch', 'false'));
    await page.evaluate(() => waitForFlagSync());
    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === false;
  }
);

const testPunchReturnsToIdle = test(
  {
    given: 'canPunch flag is true and player punches',
    when: 'Punch animation completes',
    then: 'Player returns to idle state'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());
    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const startedPunch = await page.evaluate(() => isPunching());
    if (!startedPunch) return false;
    const completed = await page.evaluate(() => waitForPunchComplete(2000));
    const state = await page.evaluate(() => getPlayerState());
    return completed && state === 'idle';
  }
);

const testPunchWorksAfterFlagToggledMidGame = test(
  {
    given: 'canPunch starts false then toggled to true mid-game',
    when: 'Player presses attack after toggle',
    then: 'Player enters punch state (CachedFlag regression test)'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canPunch', 'false'));
    await page.evaluate(() => waitForFlagSync());
    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const blockedBefore = await page.evaluate(() => !isPunching());
    if (!blockedBefore) return false;

    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());
    await new Promise(r => setTimeout(r, 50));
    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punchingAfter = await page.evaluate(() => isPunching());
    return punchingAfter === true;
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
    testPunchWorksWhenCanPunchTrue,
    testPunchBlockedWhenCanPunchFalse,
    testPunchReturnsToIdle,
    testPunchWorksAfterFlagToggledMidGame
  ],
  screenshotPath: 'tmp/test/screenshots/test-combat.png'
});
