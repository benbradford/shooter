import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 10000 });
}

const testPunchFiresDuringWalk = test(
  {
    given: 'Player is walking (walk input held)',
    when: 'Player presses attack while moving',
    then: 'Player enters punch state'
  },
  async (page) => {
    await waitForPlayer(page);
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Start walking down
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 1, true);
    });
    await new Promise(r => setTimeout(r, 200));

    // Verify player is walking
    const walkState = await page.evaluate(() => getPlayerState());
    if (walkState !== 'walk') return false;

    // Punch while still walking
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 1, true);
    });
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 0, false);
    });
    await new Promise(r => setTimeout(r, 100));

    // Check player is punching
    const punching = await page.evaluate(() => isPunching());

    // Stop walking
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });

    // Wait for punch to finish before next test
    await page.evaluate(() => waitForPunchComplete(2000));

    return punching === true;
  }
);

const testPlayerResumesWalkAfterPunch = test(
  {
    given: 'Player punches while walking',
    when: 'Punch animation completes with walk input still held',
    then: 'Player returns to walk state with walk animation'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Start walking down
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 1, true);
    });
    await new Promise(r => setTimeout(r, 200));

    // Punch while walking
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 1, true);
    });
    await new Promise(r => setTimeout(r, 100));
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 0, false);
    });

    // Wait for punch to complete
    await page.evaluate(() => waitForPunchComplete(2000));
    await new Promise(r => setTimeout(r, 50));

    // Check player returned to walk state (walk input still held)
    const state = await page.evaluate(() => getPlayerState());
    const animKey = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const anim = player.get(window.AnimationComponent);
      return anim ? anim.animationSystem.getCurrentKey() : '';
    });

    // Stop walking
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 0, false);
    });

    return state === 'walk' && animKey.startsWith('walk_');
  }
);

const testWalkingPunchAnimationPlays = test(
  {
    given: 'Player has hasSuperPunch and is walking',
    when: 'Player holds attack (enters holding phase) while moving',
    then: 'walking_punch animation path is used'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => setFlag('hasSuperPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Start walking down
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 1, true);
    });
    await new Promise(r => setTimeout(r, 200));

    // Hold attack while walking — keep held to enter holding phase
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 1, true);
    });

    // Wait for holding phase (punch anim takes ~500ms to reach HOLD_FRAME_INDEX at frame 4)
    await new Promise(r => setTimeout(r, 700));

    // Check animation is walking_punch
    const animKey = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const anim = player.get(window.AnimationComponent);
      return anim ? anim.animationSystem.getCurrentKey() : '';
    });

    // Release attack and stop walking
    await page.evaluate(() => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAim(0, 0, false);
      remoteInput.setWalk(0, 0, false);
    });

    // Wait for any resulting punch to finish
    await new Promise(r => setTimeout(r, 800));

    return animKey.startsWith('walking_punch_');
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
    testPunchFiresDuringWalk,
    testPlayerResumesWalkAfterPunch,
    testWalkingPunchAnimationPlays
  ],
  screenshotPath: 'tmp/test/screenshots/test-punch-while-moving.png'
});
