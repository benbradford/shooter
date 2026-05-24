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

const testPetDoesNotSnapToPlayerOnJumpStart = test(
  {
    given: 'Player walking toward void with pet following behind',
    when: 'Player reaches edge and initiates jump',
    then: 'Pet does not teleport to player feet — stays at its own position'
  },
  async (page) => {
    await waitForGameReady(page);

    // Move player to cell (1,5) so there's more walking distance before void at (4,5)
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);
      const cellSize = scene.grid.cellSize;
      playerT.x = 1 * cellSize + cellSize / 2;
      playerT.y = 5 * cellSize + cellSize / 2;
      petT.x = 1 * cellSize + cellSize / 2;
      petT.y = 5 * cellSize + cellSize / 2;
      // Sync collision previous positions
      const playerGC = player.get(window.GridPositionComponent);
      const petGC = pet.components ? null : null;
    });
    await new Promise(r => setTimeout(r, 100));

    // Walk player right toward the void. Pet will follow behind.
    // Record pet position every frame from jump button appearing until jump starts.
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.getScene('game');
        const player = scene.entityManager.getFirst('player');
        const pet = scene.entityManager.getFirst('pet');
        const playerT = player.require(window.TransformComponent);
        const petT = pet.require(window.TransformComponent);
        const remoteInput = enableRemoteInput();

        remoteInput.setWalk(1, 0, true);

        const positions = [];
        let jumpButtonSeen = false;
        let jumpPressed = false;

        const startTime = Date.now();
        const interval = setInterval(() => {
          // Record every frame
          positions.push({
            t: Date.now() - startTime,
            petX: petT.x,
            petY: petT.y,
            playerX: playerT.x,
            playerY: playerT.y,
          });

          if (Date.now() - startTime >= 5000) {
            remoteInput.setWalk(0, 0, false);
            clearInterval(interval);
            resolve({ jumped: false, reason: 'timeout', positions });
            return;
          }

          if (jumpPressed) return;

          const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
          if (!hudScene) return;
          const joystickEntity = hudScene.getJoystickEntity();
          if (!joystickEntity) return;
          const btn = joystickEntity.get(window.AttackButtonComponent);
          if (!btn) return;

          if (btn.getIconOverride() === 'jump' && !jumpButtonSeen) {
            jumpButtonSeen = true;
          }

          if (jumpButtonSeen && !jumpPressed) {
            // Press jump immediately when available
            if (true) {
              jumpPressed = true;
              btn.isPressed = true;
              setTimeout(() => {
                btn.isPressed = false;
                remoteInput.setWalk(0, 0, false);
              }, 100);
              // Record for another 200ms after pressing
              setTimeout(() => {
                clearInterval(interval);
                resolve({ jumped: true, positions });
              }, 200);
            }
          }
        }, 16);
      });
    });

    if (!result.jumped) {
      console.log(`❌ Jump did not happen: ${result.reason}`);
      return false;
    }

    // Analyze positions for sudden pet movement
    const positions = result.positions;
    let maxPetJump = 0;
    let maxJumpFrame = 0;
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].petX - positions[i-1].petX;
      const dy = positions[i].petY - positions[i-1].petY;
      const dist = Math.hypot(dx, dy);
      if (dist > maxPetJump) {
        maxPetJump = dist;
        maxJumpFrame = i;
      }
    }

    console.log(`Total frames recorded: ${positions.length}`);
    console.log(`Max pet movement in single frame: ${maxPetJump.toFixed(1)}px at frame ${maxJumpFrame}`);

    // The pet should never move more than ~30px in a single frame during normal gameplay
    // (500px/s * 16ms = 8px normal, allow some slack for catchup)
    // If it moves more than 50px in one frame, that's a teleport
    const TELEPORT_THRESHOLD_PX = 50;

    if (maxPetJump > TELEPORT_THRESHOLD_PX) {
      console.log(`❌ Pet teleported ${maxPetJump.toFixed(0)}px in a single frame (threshold: ${TELEPORT_THRESHOLD_PX}px)`);
      return false;
    }

    console.log(`✓ No teleport detected (max single-frame movement: ${maxPetJump.toFixed(0)}px)`);
    return true;
  }
);

await runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [testPetDoesNotSnapToPlayerOnJumpStart],
  screenshotPath: 'tmp/test/screenshots/test-pet-jump.png'
});
