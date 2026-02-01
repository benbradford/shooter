import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function moveToRow(page, targetRow, maxTimeMs = 5000) {
  return await page.evaluate((row, maxTime) => {
    return moveToRowHelper(row, maxTime);
  }, targetRow, maxTimeMs);
}

async function moveToCol(page, targetCol, maxTimeMs = 5000) {
  return await page.evaluate((col, maxTime) => {
    return moveToColHelper(col, maxTime);
  }, targetCol, maxTimeMs);
}

const testTransitionEntry = test(
  {
    given: 'Player on ground level below a staircase',
    when: 'Player moves up to the staircase',
    then: 'Player enters the transition cell'
  },
  async (page) => {
    const reached = await moveToRow(page, 1);
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      const cell = scene.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      return {
        col: gridPos.currentCell.col,
        row: gridPos.currentCell.row,
        isTransition: cell ? scene.grid.isTransition(cell) : false
      };
    });
    return reached && result.isTransition && result.col === 4 && result.row === 1;
  }
);

const testTransitionHorizontalBlock = test(
  {
    given: 'Player standing on a staircase',
    when: 'Player tries to move sideways',
    then: 'Player is blocked (can only move up/down on stairs)'
  },
  async (page) => {
    const startPos = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
    });

    page.evaluate(() => setPlayerInput(1, 0, 1000));
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => setPlayerInput(0, 0, 0));

    const endPos = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
    });

    return endPos.col === startPos.col && endPos.row === startPos.row;
  }
);

const testTransitionToLayer1 = test(
  {
    given: 'Player on a staircase',
    when: 'Player moves up the stairs',
    then: 'Player reaches the upper platform (layer 1)'
  },
  async (page) => {
    const reached = await moveToRow(page, 0);
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
    });
    return reached && result.layer === 1 && result.col === 4 && result.row === 0;
  }
);

const testLayer1EdgeBlock = test(
  {
    given: 'Player on an elevated platform',
    when: 'Player tries to walk off the edge',
    then: 'Player is blocked at the platform edge'
  },
  async (page) => {
    await moveToCol(page, 7);
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
    });
    return result.col === 6 && result.row === 0;
  }
);

const testLayer1EntryBlock = test(
  {
    given: 'Player on an elevated platform',
    when: 'Player tries to step down without stairs',
    then: 'Player is blocked (cannot drop down)'
  },
  async (page) => {
    const startPos = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
    });

    page.evaluate(() => setPlayerInput(0, 1, 1000));
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.evaluate(() => setPlayerInput(0, 0, 0));

    const endPos = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
    });

    return endPos.col === startPos.col && endPos.row === startPos.row;
  }
);

const testTransitionExit = test(
  {
    given: 'Player on an elevated platform',
    when: 'Player walks to stairs and descends',
    then: 'Player returns to ground level (layer 0)'
  },
  async (page) => {
    const reachedCol = await moveToCol(page, 4);
    const reachedRow = await moveToRow(page, 3);
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
    });
    return reachedCol && reachedRow && result.layer === 0 && result.col === 4 && result.row === 3;
  }
);

runTests({
  level: 'test/test-player-transition',
  commands: ['test/interactions/player.js'],
  tests: [
    testTransitionEntry,
    testTransitionHorizontalBlock,
    testTransitionToLayer1,
    testLayer1EdgeBlock,
    testLayer1EntryBlock,
    testTransitionExit
  ],
  screenshotPath: 'tmp/test/screenshots/test-player-transition.png'
});