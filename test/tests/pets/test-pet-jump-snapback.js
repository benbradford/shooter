import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function waitForGameReady(page) {
  await page.waitForFunction(() => {
    const scene = window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 15000 });
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('pet');
  }, { timeout: 10000 });
  await page.evaluate(() => {
    window.WorldStateManager.getInstance().setFlag('canJump', 'true');
  });
  await new Promise(r => setTimeout(r, 500));
}

const testPetStaysAfterJumpLanding = test(
  {
    given: 'Player and pet are adjacent, player jumps over a void cell',
    when: 'The jump completes and 1 second passes',
    then: 'Pet remains near the landing position and does not snap back to pre-jump position'
  },
  async (page) => {
    await waitForGameReady(page);

    // The level starts player at (3,5) which is already one cell left of void at (4,5).
    // Wait for pet to settle near the player.
    await new Promise(r => setTimeout(r, 1000));

    // Record pet's pre-jump position, then walk player right toward void and jump
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.getScene('game');
        const player = scene.entityManager.getFirst('player');
        const pet = scene.entityManager.getFirst('pet');
        const playerT = player.require(window.TransformComponent);
        const petT = pet.require(window.TransformComponent);
        const cellSize = scene.grid.cellSize;

        const petPreJumpX = petT.x;
        const petPreJumpY = petT.y;

        const remoteInput = enableRemoteInput();
        remoteInput.setWalk(1, 0, true);

        let jumpPressed = false;
        let jumpLanded = false;
        let landTime = 0;
        const startTime = Date.now();

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;

          if (elapsed >= 8000) {
            remoteInput.setWalk(0, 0, false);
            clearInterval(interval);
            resolve({ success: false, reason: 'timeout' });
            return;
          }

          // Try to press jump button when available
          if (!jumpPressed) {
            const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
            if (hudScene) {
              const joystickEntity = hudScene.getJoystickEntity();
              if (joystickEntity) {
                const btn = joystickEntity.get(window.AttackButtonComponent);
                if (btn && btn.getIconOverride() === 'jump') {
                  jumpPressed = true;
                  btn.isPressed = true;
                  setTimeout(() => {
                    btn.isPressed = false;
                    remoteInput.setWalk(0, 0, false);
                  }, 100);
                }
              }
            }
            return;
          }

          // After jump pressed, wait for player to land (isJumping returns false)
          if (!jumpLanded) {
            const jumpComp = player.get(window.JumpComponent);
            if (jumpComp && !jumpComp.isJumping()) {
              jumpLanded = true;
              landTime = Date.now();
            }
            return;
          }

          // Wait 1 second after landing to observe pet behavior
          const timeSinceLand = Date.now() - landTime;
          if (timeSinceLand >= 1000) {
            clearInterval(interval);

            const petFinalX = petT.x;
            const petFinalY = petT.y;
            const playerFinalX = playerT.x;
            const playerFinalY = playerT.y;

            // Landing cell is (5,5) — center at x = 5*64+32 = 352
            const landingX = 5 * cellSize + cellSize / 2;

            const petDistFromPreJump = Math.hypot(petFinalX - petPreJumpX, petFinalY - petPreJumpY);
            const petDistFromPlayer = Math.hypot(petFinalX - playerFinalX, petFinalY - playerFinalY);
            const petDistFromLanding = Math.abs(petFinalX - landingX);

            resolve({
              success: true,
              petPreJumpX,
              petPreJumpY,
              petFinalX,
              petFinalY,
              playerFinalX,
              playerFinalY,
              landingX,
              petDistFromPreJump,
              petDistFromPlayer,
              petDistFromLanding
            });
          }
        }, 16);
      });
    });

    if (!result.success) {
      console.log(`❌ Test failed: ${result.reason}`);
      return false;
    }

    console.log(`Pet pre-jump position: (${result.petPreJumpX.toFixed(0)}, ${result.petPreJumpY.toFixed(0)})`);
    console.log(`Pet final position:    (${result.petFinalX.toFixed(0)}, ${result.petFinalY.toFixed(0)})`);
    console.log(`Player final position: (${result.playerFinalX.toFixed(0)}, ${result.playerFinalY.toFixed(0)})`);
    console.log(`Pet distance from pre-jump pos: ${result.petDistFromPreJump.toFixed(0)}px`);
    console.log(`Pet distance from player: ${result.petDistFromPlayer.toFixed(0)}px`);

    // The bug: pet snaps BACK to pre-jump position after landing
    // If pet is within 30px of its pre-jump position, it snapped back
    const SNAPBACK_THRESHOLD_PX = 30;
    if (result.petDistFromPreJump < SNAPBACK_THRESHOLD_PX) {
      console.log(`❌ Pet snapped back to pre-jump position (only ${result.petDistFromPreJump.toFixed(0)}px away)`);
      return false;
    }

    // Pet should be reasonably close to the player (within follow distance)
    const MAX_ACCEPTABLE_DIST_FROM_PLAYER_PX = 250;
    if (result.petDistFromPlayer > MAX_ACCEPTABLE_DIST_FROM_PLAYER_PX) {
      console.log(`❌ Pet is too far from player: ${result.petDistFromPlayer.toFixed(0)}px`);
      return false;
    }

    console.log(`✓ Pet stayed near landing area (${result.petDistFromPreJump.toFixed(0)}px from pre-jump, ${result.petDistFromPlayer.toFixed(0)}px from player)`);
    return true;
  }
);

await runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [testPetStaysAfterJumpLanding],
  screenshotPath: 'tmp/test/screenshots/test-pet-jump-snapback.png'
});
