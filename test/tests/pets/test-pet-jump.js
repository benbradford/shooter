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

/**
 * Helper: walk player right, press jump when available, wait for landing,
 * then wait observeMs after landing. Returns full position trace.
 */
async function walkAndJump(page, observeAfterLandMs = 1500) {
  return page.evaluate((observeMs) => {
    return new Promise((resolve) => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);
      const jumpComp = player.get(window.JumpComponent);
      const remoteInput = enableRemoteInput();

      remoteInput.setWalk(1, 0, true);

      const positions = [];
      let jumpPressed = false;
      let jumpLanded = false;
      let landTime = 0;
      let jumpFrame = -1;
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        positions.push({
          t: elapsed,
          petX: petT.x,
          petY: petT.y,
          playerX: playerT.x,
          playerY: playerT.y,
          jumping: jumpComp ? jumpComp.isJumping() : false,
        });

        if (elapsed >= 10000) {
          remoteInput.setWalk(0, 0, false);
          clearInterval(interval);
          resolve({ success: false, reason: 'timeout', positions });
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
                jumpFrame = positions.length - 1;
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

        // Wait for player to land
        if (!jumpLanded) {
          if (jumpComp && !jumpComp.isJumping()) {
            jumpLanded = true;
            landTime = Date.now();
          }
          return;
        }

        // Observe for a while after landing
        if (Date.now() - landTime >= observeMs) {
          clearInterval(interval);
          resolve({ success: true, positions, jumpFrame });
        }
      }, 16);
    });
  }, observeAfterLandMs);
}

// ─── TEST 1: No teleport on jump start ─────────────────────────────────────
const testNoTeleportOnJumpStart = test(
  {
    given: 'Player walking toward void with pet following behind',
    when: 'Player initiates a jump over the void',
    then: 'Pet does not teleport — max single-frame movement stays under 50px'
  },
  async (page) => {
    await waitForGameReady(page);

    // Position player far left so pet has room to trail behind
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
    });
    await new Promise(r => setTimeout(r, 100));

    const result = await walkAndJump(page);

    if (!result.success) {
      console.log(`❌ ${result.reason}`);
      return false;
    }

    const positions = result.positions;
    let maxPetMove = 0;
    let maxFrame = 0;
    for (let i = 1; i < positions.length; i++) {
      const dist = Math.hypot(
        positions[i].petX - positions[i - 1].petX,
        positions[i].petY - positions[i - 1].petY
      );
      if (dist > maxPetMove) {
        maxPetMove = dist;
        maxFrame = i;
      }
    }

    console.log(`Max pet single-frame movement: ${maxPetMove.toFixed(1)}px (frame ${maxFrame})`);

    const TELEPORT_THRESHOLD_PX = 50;
    if (maxPetMove > TELEPORT_THRESHOLD_PX) {
      const before = positions[maxFrame - 1];
      const after = positions[maxFrame];
      console.log(`❌ Pet teleported ${maxPetMove.toFixed(0)}px`);
      console.log(`   Before: pet=(${before.petX.toFixed(0)},${before.petY.toFixed(0)}) player=(${before.playerX.toFixed(0)},${before.playerY.toFixed(0)})`);
      console.log(`   After:  pet=(${after.petX.toFixed(0)},${after.petY.toFixed(0)}) player=(${after.playerX.toFixed(0)},${after.playerY.toFixed(0)})`);
      return false;
    }

    console.log(`✓ No teleport`);
    return true;
  }
);

// ─── TEST 2: Pet reaches player after jump ──────────────────────────────────
const testPetReachesPlayerAfterJump = test(
  {
    given: 'Player jumps over a void cell with pet on the other side',
    when: '1.5 seconds pass after the player lands',
    then: 'Pet ends up within follow distance of the player (not stuck on the far side)'
  },
  async (page) => {
    await waitForGameReady(page);

    // Position player 1 cell left of void, pet next to player
    await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);
      const cellSize = scene.grid.cellSize;
      // Player at cell (3,5) — void is at (4,5), landing at (5,5)
      playerT.x = 3 * cellSize + cellSize / 2;
      playerT.y = 5 * cellSize + cellSize / 2;
      // Pet right next to player
      petT.x = 2 * cellSize + cellSize / 2;
      petT.y = 5 * cellSize + cellSize / 2;
    });
    await new Promise(r => setTimeout(r, 100));

    const result = await walkAndJump(page, 1500);

    if (!result.success) {
      console.log(`❌ ${result.reason}`);
      return false;
    }

    const positions = result.positions;
    const finalPos = positions[positions.length - 1];
    const petDistFromPlayer = Math.hypot(
      finalPos.petX - finalPos.playerX,
      finalPos.petY - finalPos.playerY
    );

    // Pet should be within START_FOLLOW_DISTANCE_PX (192) of the player
    // If it's stuck on the other side of void, it will be far away
    const MAX_ACCEPTABLE_DIST_PX = 250;

    console.log(`Pet final pos: (${finalPos.petX.toFixed(0)}, ${finalPos.petY.toFixed(0)})`);
    console.log(`Player final pos: (${finalPos.playerX.toFixed(0)}, ${finalPos.playerY.toFixed(0)})`);
    console.log(`Pet-player distance: ${petDistFromPlayer.toFixed(0)}px`);

    if (petDistFromPlayer > MAX_ACCEPTABLE_DIST_PX) {
      console.log(`❌ Pet is too far from player — likely stuck on the other side of void`);
      return false;
    }

    console.log(`✓ Pet reached player`);
    return true;
  }
);

// ─── TEST 3: Pet crosses the void (ends up past it) ─────────────────────────
const testPetCrossesVoid = test(
  {
    given: 'Player jumps over void at column 4',
    when: '1.5 seconds pass after landing',
    then: 'Pet x-position is past the void column (crossed the gap)'
  },
  async (page) => {
    await waitForGameReady(page);

    await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);
      const cellSize = scene.grid.cellSize;
      playerT.x = 3 * cellSize + cellSize / 2;
      playerT.y = 5 * cellSize + cellSize / 2;
      petT.x = 2 * cellSize + cellSize / 2;
      petT.y = 5 * cellSize + cellSize / 2;
    });
    await new Promise(r => setTimeout(r, 100));

    const result = await walkAndJump(page, 1500);

    if (!result.success) {
      console.log(`❌ ${result.reason}`);
      return false;
    }

    const positions = result.positions;
    const finalPos = positions[positions.length - 1];

    // Void is at column 4 — cell right edge is at x = 5 * 64 = 320
    // Pet must be past this to have crossed
    const VOID_RIGHT_EDGE_X = 5 * 64;

    console.log(`Pet final x: ${finalPos.petX.toFixed(0)} (void right edge: ${VOID_RIGHT_EDGE_X})`);

    if (finalPos.petX < VOID_RIGHT_EDGE_X) {
      console.log(`❌ Pet did not cross the void — stuck at x=${finalPos.petX.toFixed(0)}`);
      return false;
    }

    console.log(`✓ Pet crossed the void`);
    return true;
  }
);

await runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [
    testNoTeleportOnJumpStart,
    testPetReachesPlayerAfterJump,
    testPetCrossesVoid,
  ],
  screenshotPath: 'tmp/test/screenshots/test-pet-jump.png'
});
