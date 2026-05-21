import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 10000 });
}

function getPlayerCell(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
}

function isPlayerJumping(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    if (!window.JumpComponent) return false;
    const jump = player.get(window.JumpComponent);
    return jump ? jump.isJumping() : false;
  });
}

async function walkTowardAndJump(page, dirX, dirY, maxTimeMs = 3000) {
  return page.evaluate((dx, dy, maxTime) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    const remoteInput = enableRemoteInput();

    remoteInput.setWalk(dx, dy, true);

    const startTime = Date.now();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (Date.now() - startTime >= maxTime) {
          remoteInput.setWalk(0, 0, false);
          clearInterval(interval);
          resolve({ jumped: false, col: gridPos.currentCell.col, row: gridPos.currentCell.row });
          return;
        }

        const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
        if (!hudScene) return;
        const joystickEntity = hudScene.getJoystickEntity();
        if (!joystickEntity) return;
        const btn = joystickEntity.get(window.AttackButtonComponent);
        if (!btn) return;

        if (btn.getIconOverride() === 'jump') {
          btn.isPressed = true;
          setTimeout(() => { btn.isPressed = false; }, 100);
          setTimeout(() => {
            remoteInput.setWalk(0, 0, false);
            clearInterval(interval);
            setTimeout(() => {
              resolve({ jumped: true, col: gridPos.currentCell.col, row: gridPos.currentCell.row });
            }, 800);
          }, 700);
        }
      }, 16);
    });
  }, dirX, dirY, maxTimeMs);
}

const testJumpWorksWhenCanJumpTrue = test(
  {
    given: 'Player at cell (3,5) with canJump=true and void at (4,5)',
    when: 'Player walks right to edge and presses attack button',
    then: 'Player jumps across gap and lands at cell (5,5)'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canJump', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    const startCell = await getPlayerCell(page);
    if (startCell.col !== 3 || startCell.row !== 5) return false;

    const result = await walkTowardAndJump(page, 1, 0);
    if (!result.jumped) return false;

    const endCell = await getPlayerCell(page);
    return endCell.col === 5 && endCell.row === 5;
  }
);

const testJumpBlockedWhenCanJumpFalse = test(
  {
    given: 'Player at cell (3,5) with canJump=false and void at (4,5)',
    when: 'Player walks right toward void',
    then: 'Player is blocked and stays at col 3'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canJump', 'false');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      const cellSize = scene.grid.cellSize;
      transform.x = 3 * cellSize + cellSize / 2;
      transform.y = 5 * cellSize + cellSize / 2;
    });
    await new Promise(r => setTimeout(r, 50));

    const result = await walkTowardAndJump(page, 1, 0, 2000);

    const endCell = await getPlayerCell(page);
    return !result.jumped && endCell.col <= 4;
  }
);

const testJumpLandsAtCorrectCell = test(
  {
    given: 'Player with canJump=true near void gap',
    when: 'Jump completes',
    then: 'Player grid position is exactly cell (5,5)'
  },
  async (page) => {
    await waitForPlayer(page);

    await page.evaluate(() => {
      window.WorldStateManager.getInstance().setFlag('canJump', 'true');
    });
    await page.evaluate(() => waitForFlagSync());

    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      const cellSize = scene.grid.cellSize;
      transform.x = 3 * cellSize + cellSize / 2;
      transform.y = 5 * cellSize + cellSize / 2;
    });
    await new Promise(r => setTimeout(r, 50));

    const result = await walkTowardAndJump(page, 1, 0);
    if (!result.jumped) return false;

    const jumping = await isPlayerJumping(page);
    if (jumping) return false;

    const endCell = await getPlayerCell(page);
    return endCell.col === 5 && endCell.row === 5;
  }
);

runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testJumpWorksWhenCanJumpTrue,
    testJumpBlockedWhenCanJumpFalse,
    testJumpLandsAtCorrectCell
  ],
  screenshotPath: 'tmp/test/screenshots/test-jump.png'
});
