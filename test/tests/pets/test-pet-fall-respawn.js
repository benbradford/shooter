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

const testPetRespawnsAtPlayerAfterFall = test(
  {
    given: 'Player jumps into a double-void (fall jump) with pet following',
    when: 'Player respawns at safe position after falling',
    then: 'Pet respawns at the player position, not on the void cell'
  },
  async (page) => {
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.getScene('game');
        const player = scene.entityManager.getFirst('player');
        const pet = scene.entityManager.getFirst('pet');
        const playerT = player.require(window.TransformComponent);
        const petT = pet.require(window.TransformComponent);
        const jumpComp = player.get(window.JumpComponent);
        const remoteInput = enableRemoteInput();
        const cellSize = scene.grid.cellSize;

        // Record player start position (safe position for respawn)
        const playerStartX = playerT.x;
        const playerStartY = playerT.y;

        remoteInput.setWalk(1, 0, true);

        let jumpPressed = false;
        let playerRespawned = false;
        let respawnTime = 0;
        const startTime = Date.now();

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;

          if (elapsed >= 12000) {
            remoteInput.setWalk(0, 0, false);
            clearInterval(interval);
            resolve({ success: false, reason: 'timeout' });
            return;
          }

          // Press jump when button appears
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

          // Wait for player to finish falling and respawn
          // Player respawns when jump is over AND player is back near start
          if (!playerRespawned) {
            if (jumpComp && !jumpComp.isJumping()) {
              // Player has landed/respawned
              playerRespawned = true;
              respawnTime = Date.now();
            }
            return;
          }

          // Wait 500ms after respawn for pet to settle
          if (Date.now() - respawnTime >= 500) {
            clearInterval(interval);

            const petFinalX = petT.x;
            const petFinalY = petT.y;
            const playerFinalX = playerT.x;
            const playerFinalY = playerT.y;

            // Void cells are at columns 4 and 5
            // Void region x range: col 4 start = 4*64=256, col 5 end = 6*64=384
            const voidStartX = 4 * cellSize;
            const voidEndX = 6 * cellSize;

            const petOnVoid = petFinalX >= voidStartX && petFinalX <= voidEndX;
            const petDistFromPlayer = Math.hypot(petFinalX - playerFinalX, petFinalY - playerFinalY);

            resolve({
              success: true,
              playerStartX,
              playerStartY,
              playerFinalX,
              playerFinalY,
              petFinalX,
              petFinalY,
              petOnVoid,
              petDistFromPlayer,
              voidStartX,
              voidEndX,
            });
          }
        }, 16);
      });
    });

    if (!result.success) {
      console.log(`❌ ${result.reason}`);
      return false;
    }

    console.log(`Player start: (${result.playerStartX.toFixed(0)}, ${result.playerStartY.toFixed(0)})`);
    console.log(`Player after respawn: (${result.playerFinalX.toFixed(0)}, ${result.playerFinalY.toFixed(0)})`);
    console.log(`Pet after respawn: (${result.petFinalX.toFixed(0)}, ${result.petFinalY.toFixed(0)})`);
    console.log(`Pet on void: ${result.petOnVoid}`);
    console.log(`Pet-player distance: ${result.petDistFromPlayer.toFixed(0)}px`);

    if (result.petOnVoid) {
      console.log(`❌ Pet spawned on void cell (x=${result.petFinalX.toFixed(0)}, void range: ${result.voidStartX}-${result.voidEndX})`);
      return false;
    }

    const MAX_DIST_FROM_PLAYER_PX = 150;
    if (result.petDistFromPlayer > MAX_DIST_FROM_PLAYER_PX) {
      console.log(`❌ Pet too far from player after respawn: ${result.petDistFromPlayer.toFixed(0)}px`);
      return false;
    }

    console.log(`✓ Pet respawned near player, not on void`);
    return true;
  }
);

await runTests({
  level: 'test/test-fall-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [testPetRespawnsAtPlayerAfterFall],
  screenshotPath: 'tmp/test/screenshots/test-pet-fall-respawn.png'
});
