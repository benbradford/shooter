import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const PUSH_MOVE_DURATION_MS = 800;

function getPushablePosition(page, entityId) {
  return page.evaluate((id) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const entities = scene.entityManager.getAll('pushable');
    for (const entity of entities) {
      if (entity.id === id) {
        const pushable = entity.get(window.PushableComponent);
        if (pushable) {
          return { col: pushable.getCurrentCol(), row: pushable.getCurrentRow() };
        }
      }
    }
    return null;
  }, entityId);
}

const testPushMovesBlock = test(
  {
    given: 'a pushable block with canPush=true',
    when: 'Player walks into it and presses attack',
    then: 'Block moves one cell in push direction'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => setFlag('canPush', 'true'));
    await page.evaluate(() => waitForFlagSync());

    const beforePos = await getPushablePosition(page, 'pushable_enabled');
    if (!beforePos || beforePos.col !== 5 || beforePos.row !== 4) return false;

    // Walk up into the pushable block
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, -1, true);
    });

    // Wait until player enters push state
    await page.waitForFunction(() => {
      return getPlayerState() === 'push';
    }, { timeout: 3000 });

    // Press attack to push
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, -1, true);
    });
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 0, false);
    });

    // Wait for push animation to complete
    await new Promise(r => setTimeout(r, PUSH_MOVE_DURATION_MS));

    // Release walk input
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });

    const afterPos = await getPushablePosition(page, 'pushable_enabled');
    return afterPos !== null && afterPos.col === 5 && afterPos.row === 3;
  }
);

const testPushBlockedByWall = test(
  {
    given: 'a pushable block adjacent to a wall',
    when: 'Player pushes the block toward the wall',
    then: 'Block does not move'
  },
  async (page) => {
    // After the first test, the block is now at (5,3) with wall at (5,2)
    const beforePos = await getPushablePosition(page, 'pushable_enabled');
    if (!beforePos || beforePos.col !== 5 || beforePos.row !== 3) return false;

    // Walk up into the block again
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, -1, true);
    });

    await page.waitForFunction(() => {
      return getPlayerState() === 'push';
    }, { timeout: 3000 });

    // Press attack to try to push
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, -1, true);
    });
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 0, false);
    });

    await new Promise(r => setTimeout(r, PUSH_MOVE_DURATION_MS));

    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });

    const afterPos = await getPushablePosition(page, 'pushable_enabled');
    return afterPos !== null && afterPos.col === 5 && afterPos.row === 3;
  }
);

const testPushDisabledDoesNotMove = test(
  {
    given: 'a pushable block with pushEnabled=false',
    when: 'Player walks into it',
    then: 'Player does not enter push state'
  },
  async (page) => {
    const beforePos = await getPushablePosition(page, 'pushable_disabled');
    if (!beforePos || beforePos.col !== 7 || beforePos.row !== 5) return false;

    // Move player to approach the disabled block from the left
    await page.evaluate(() => moveToCellHelper(6, 5, 3000));

    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(1, 0, true);
    });

    // Wait a moment and check player state — should NOT enter push
    await new Promise(r => setTimeout(r, 1000));

    const state = await page.evaluate(() => getPlayerState());

    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });

    const afterPos = await getPushablePosition(page, 'pushable_disabled');
    return state !== 'push' && afterPos.col === 7 && afterPos.row === 5;
  }
);

runTests({
  level: 'test/test-push',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testPushMovesBlock,
    testPushBlockedByWall,
    testPushDisabledDoesNotMove
  ],
  screenshotPath: 'tmp/test/screenshots/test-push.png'
});
