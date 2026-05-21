import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testEnteringTriggerCellFiresEvent = test(
  {
    given: 'a repeating trigger at cell (4,2)',
    when: 'the player walks onto cell (4,2)',
    then: 'the event_repeating event fires'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    const eventFired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        const eventManager = scene.eventManager;

        const listener = { onEvent() { resolve(true); } };
        eventManager.register('event_repeating', listener);

        moveToPathfindHelper(4, 2, 8000).then((r) => {
          if (!r.reached) resolve(false);
        });

        setTimeout(() => resolve(false), 9000);
      });
    });

    return eventFired === true;
  }
);

const testTriggerSetsFlag = test(
  {
    given: 'a one-shot trigger at cell (6,2) with event_oneshot',
    when: 'the player walks onto cell (6,2)',
    then: 'WorldStateManager records the trigger as fired for this level'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const ws = window.WorldStateManager.getInstance();
      const levelName = ws.getCurrentLevelName();

      const firedBefore = ws.getLevelState(levelName).firedTriggers.includes('event_oneshot');
      if (firedBefore) return 'already_fired';

      const moveResult = await moveToPathfindHelper(6, 2, 8000);
      if (!moveResult.reached) return 'not_reached';

      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (ws.getLevelState(levelName).firedTriggers.includes('event_oneshot')) {
          return true;
        }
      }
      return 'not_in_firedTriggers';
    });

    return result === true;
  }
);

const testOneShotTriggerOnlyFiresOnce = test(
  {
    given: 'the one-shot trigger at cell (6,2) was already fired in a previous test',
    when: 'the player walks onto cell (6,2) again',
    then: 'the event does not fire again (entity was destroyed)'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const eventManager = scene.eventManager;

      // Move away first so we can re-enter
      await moveToPathfindHelper(3, 2, 5000);
      await new Promise(r => setTimeout(r, 100));

      let fireCount = 0;
      const listener = { onEvent() { fireCount++; } };
      eventManager.register('event_oneshot', listener);

      const move = await moveToPathfindHelper(6, 2, 8000);
      if (!move.reached) return { reached: false, fireCount };

      await new Promise(r => setTimeout(r, 300));

      eventManager.deregister('event_oneshot', listener);
      return { reached: true, fireCount };
    });

    return result.reached && result.fireCount === 0;
  }
);

runTests({
  level: 'test/test-triggers',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testEnteringTriggerCellFiresEvent,
    testTriggerSetsFlag,
    testOneShotTriggerOnlyFiresOnce
  ],
  screenshotPath: 'tmp/test/screenshots/test-triggers.png'
});
