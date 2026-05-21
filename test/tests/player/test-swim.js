import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

function teleportPlayer(page, col, row) {
  return page.evaluate(({ col, row }) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const transform = player.require(window.TransformComponent);
    transform.x = col * 64 + 32;
    transform.y = row * 64 + 32;
  }, { col, row });
}

function getPlayerCell(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
}

const testCanSwimEntersWater = test(
  {
    given: 'canSwim flag is true',
    when: 'Player walks into a water cell',
    then: 'Player enters water successfully'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    const result = await page.evaluate(() => moveToCellHelper(5, 5, 5000));
    if (!result.reached) return false;

    await new Promise(r => setTimeout(r, 500));

    const inWater = await page.evaluate(() => isPlayerInWater());
    return inWater === true;
  }
);

const testCannotSwimBlockedByWater = test(
  {
    given: 'canSwim flag is false',
    when: 'Player walks toward a water cell',
    then: 'Player is blocked and cannot enter water'
  },
  async (page) => {
    await teleportPlayer(page, 3, 5);
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    const result = await page.evaluate(() => moveToCellHelper(5, 5, 3000));

    const inWater = await page.evaluate(() => isPlayerInWater());
    return inWater === false && !result.reached;
  }
);

const testPunchDisabledWhileSwimming = test(
  {
    given: 'Player is swimming in water',
    when: 'Player attempts to punch',
    then: 'Punch is blocked'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => setFlag('canPunch', 'true'));
    await page.evaluate(() => waitForFlagSync());

    await teleportPlayer(page, 4, 5);
    await new Promise(r => setTimeout(r, 200));

    const moveResult = await page.evaluate(() => moveToCellHelper(5, 5, 5000));
    if (!moveResult.reached) return false;

    await new Promise(r => setTimeout(r, 500));

    const inWater = await page.evaluate(() => isPlayerInWater());
    if (!inWater) return false;

    await page.evaluate(() => punch(0, 1));
    await new Promise(r => setTimeout(r, 150));
    const punching = await page.evaluate(() => isPunching());
    return punching === false;
  }
);

const testSwimUnderBridge = test(
  {
    given: 'Player is swimming in water',
    when: 'Player swims through a bridge+water cell',
    then: 'Player can traverse the bridge cell and remain swimming on the other side'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Walk player back to dry land first to reset water state
    await teleportPlayer(page, 2, 5);
    await new Promise(r => setTimeout(r, 600));

    // Walk from dry land (2,5) toward water entry at (5,5)
    const toEdge = await page.evaluate(() => moveToCellHelper(5, 5, 5000));
    if (!toEdge.reached) return false;
    await new Promise(r => setTimeout(r, 800));

    const inWater = await page.evaluate(() => isPlayerInWater());
    if (!inWater) return false;

    // Swim right through bridge at (7,5) to water at (8,5)
    const throughResult = await page.evaluate(() => moveToCellHelper(8, 5, 5000));
    if (!throughResult.reached) return false;
    await new Promise(r => setTimeout(r, 500));

    const inWaterAfterBridge = await page.evaluate(() => isPlayerInWater());
    return inWaterAfterBridge === true;
  }
);

const testExitWaterOntoLand = test(
  {
    given: 'Player is swimming in water at the edge',
    when: 'Player swims toward dry land',
    then: 'Player exits water and lands on dry cell'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // After the bridge test, player is at (8,5) swimming.
    // Swim left to edge cell (5,5) then exit onto dry land (4,5)
    const toEdge = await page.evaluate(() => moveToCellHelper(5, 5, 5000));
    if (!toEdge.reached) return false;
    await new Promise(r => setTimeout(r, 300));

    const inWater = await page.evaluate(() => isPlayerInWater());
    if (!inWater) return false;

    // Now swim left to exit onto dry land
    const exitResult = await page.evaluate(() => moveToCellHelper(4, 5, 5000));
    if (!exitResult.reached) return false;
    await new Promise(r => setTimeout(r, 500));

    const inWaterAfter = await page.evaluate(() => isPlayerInWater());
    const cell = await getPlayerCell(page);
    return inWaterAfter === false && cell.col === 4;
  }
);

const testStaysInWaterWhenNotAtEdge = test(
  {
    given: 'Player is swimming in the middle of a water area',
    when: 'Player swims to another water cell (not toward shore)',
    then: 'Player stays in water and does not exit'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Start fresh from dry land, enter water
    await teleportPlayer(page, 4, 4);
    await new Promise(r => setTimeout(r, 200));

    const enterResult = await page.evaluate(() => moveToCellHelper(5, 4, 5000));
    if (!enterResult.reached) return false;
    await new Promise(r => setTimeout(r, 800));

    const inWater = await page.evaluate(() => isPlayerInWater());
    if (!inWater) return false;

    // Swim down within water (row 4 -> row 6, all water)
    const swimResult = await page.evaluate(() => moveToCellHelper(5, 6, 5000));
    if (!swimResult.reached) return false;
    await new Promise(r => setTimeout(r, 500));

    const stillInWater = await page.evaluate(() => isPlayerInWater());
    return stillInWater === true;
  }
);

const testCannotWalkFromBridgeIntoWater = test(
  {
    given: 'Player walks onto a bridge+water cell from dry land (not swimming)',
    when: 'Player tries to walk from the bridge into adjacent water-only cell',
    then: 'Player is blocked from entering water while on bridge'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'true'));
    await page.evaluate(() => waitForFlagSync());

    // Walk player to dry land at (10,5) then onto bridge at (9,5)
    await teleportPlayer(page, 10, 5);
    await new Promise(r => setTimeout(r, 400));

    // Walk left onto the bridge cell
    const toBridge = await page.evaluate(() => moveToCellHelper(9, 5, 3000));
    if (!toBridge.reached) return false;
    await new Promise(r => setTimeout(r, 400));

    // On bridge — should NOT be swimming
    const onBridgeNotSwimming = await page.evaluate(() => !isPlayerInWater());
    if (!onBridgeNotSwimming) return false;

    // Try to walk left into water-only cell (8,5)
    const result = await page.evaluate(() => moveToCellHelper(8, 5, 2000));

    // Should be blocked — can't walk from bridge onto water without swimming
    return !result.reached;
  }
);

runTests({
  level: 'test/test-swim',
  commands: [
    'test/interactions/player.js',
    'test/interactions/combat.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testCanSwimEntersWater,
    testCannotSwimBlockedByWater,
    testPunchDisabledWhileSwimming,
    testSwimUnderBridge,
    testExitWaterOntoLand,
    testStaysInWaterWhenNotAtEdge,
    testCannotWalkFromBridgeIntoWater
  ],
  screenshotPath: 'tmp/test/screenshots/test-swim.png'
});
