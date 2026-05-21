import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function spawnPetAndWait(page) {
  // Wait for game scene to fully create (player exists) - match working test pattern
  await page.waitForFunction(() => {
    const scene = window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 15000 });
  // Now wait for pet (spawned async by PetManager)
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('pet');
  }, { timeout: 10000 });
  // Enable jump flag
  await page.evaluate(() => {
    window.WorldStateManager.getInstance().setFlag('canJump', 'true');
  });
  await new Promise(r => setTimeout(r, 500));
}

async function waitForJumpComplete(page, timeoutMs = 3000) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('game');
    const player = scene.entityManager.getFirst('player');
    const jump = player.get(window.JumpComponent);
    return !jump || !jump.isJumping();
  }, { timeout: timeoutMs });
}

const testPetFollowsAfterPlatformJump = test(
  {
    given: 'Player and pet on platform (layer 1)',
    when: 'Player jumps down off platform',
    then: 'Pet lands near player, not back at old position'
  },
  async (page) => {
    await spawnPetAndWait(page);

    // Record the pet's initial position on the platform
    const preJump = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);

      return {
        playerX: playerT.x, playerY: playerT.y,
        petX: petT.x, petY: petT.y
      };
    });

    console.log(`Pre-jump: player=(${preJump.playerX.toFixed(0)}, ${preJump.playerY.toFixed(0)}) pet=(${preJump.petX.toFixed(0)}, ${preJump.petY.toFixed(0)})`);

    // Walk player down toward the platform edge and trigger jump
    const jumpResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.getScene('game');
        const player = scene.entityManager.getFirst('player');
        const remoteInput = enableRemoteInput();

        // Enable jumping
        window.WorldStateManager.getInstance().setFlag('canJump', 'true');

        // Walk right toward void gap at col 4
        remoteInput.setWalk(1, 0, true);

        const startTime = Date.now();
        const interval = setInterval(() => {
          if (Date.now() - startTime >= 5000) {
            remoteInput.setWalk(0, 0, false);
            clearInterval(interval);
            resolve({ jumped: false, reason: 'timeout' });
            return;
          }

          const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
          if (!hudScene) return;
          const joystickEntity = hudScene.getJoystickEntity();
          if (!joystickEntity) return;
          const btn = joystickEntity.get(window.AttackButtonComponent);
          if (!btn) return;

          if (btn.getIconOverride() === 'jump') {
            // Press the jump button
            btn.isPressed = true;
            setTimeout(() => { btn.isPressed = false; }, 100);
            setTimeout(() => {
              remoteInput.setWalk(0, 0, false);
              clearInterval(interval);
              // Wait for jump to complete
              setTimeout(() => {
                resolve({ jumped: true });
              }, 1500);
            }, 100);
          }
        }, 16);
      });
    });

    if (!jumpResult.jumped) {
      console.log(`❌ Jump did not happen: ${jumpResult.reason}`);
      return false;
    }

    // Wait a bit more for pet to settle
    await new Promise(r => setTimeout(r, 500));

    // Check positions after jump
    const postJump = await page.evaluate(() => {
      const scene = window.game.scene.getScene('game');
      const player = scene.entityManager.getFirst('player');
      const pet = scene.entityManager.getFirst('pet');
      const playerT = player.require(window.TransformComponent);
      const petT = pet.require(window.TransformComponent);
      const playerGrid = player.require(window.GridPositionComponent);
      const petFollow = pet.get(window.PetFollowComponent);

      return {
        playerX: playerT.x, playerY: playerT.y,
        petX: petT.x, petY: petT.y,
        playerLayer: playerGrid.currentLayer,
        distance: Math.hypot(playerT.x - petT.x, playerT.y - petT.y)
      };
    });

    console.log(`Post-jump: player=(${postJump.playerX.toFixed(0)}, ${postJump.playerY.toFixed(0)}) pet=(${postJump.petX.toFixed(0)}, ${postJump.petY.toFixed(0)})`);
    console.log(`Distance pet-player: ${postJump.distance.toFixed(0)}px, playerLayer: ${postJump.playerLayer}`);

    // The pet should have moved RIGHT with the player across the gap
    const petMovedRight = postJump.petX > preJump.petX + 50;
    // The pet should be within reasonable distance of the player
    const petNearPlayer = postJump.distance < 300;

    if (!petMovedRight) {
      console.log(`❌ Pet did not move right (petX went from ${preJump.petX.toFixed(0)} to ${postJump.petX.toFixed(0)})`);
      return false;
    }

    if (!petNearPlayer) {
      console.log(`❌ Pet too far from player: ${postJump.distance.toFixed(0)}px`);
      return false;
    }

    return true;
  }
);

await runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [testPetFollowsAfterPlatformJump],
  screenshotPath: 'tmp/test/screenshots/test-pet-jump.png'
});
