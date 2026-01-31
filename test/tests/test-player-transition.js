import { test } from '../helpers/test-helper.js';
import { runTests } from '../helpers/test-runner.js';

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
    given: 'Player at (4,3) with transition cell at (4,1)',
    when: 'Player moves up to row 1',
    then: 'Player enters transition cell at (4,1)'
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
        isTransition: cell?.isTransition ?? false
      };
    });
    return reached && result.isTransition && result.col === 4 && result.row === 1;
  }
);

const testTransitionHorizontalBlock = test(
  {
    given: 'Player in transition cell at (4,1)',
    when: 'Player tries to move right',
    then: 'Player is blocked'
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
    given: 'Player in transition cell at (4,1)',
    when: 'Player moves up to row 0',
    then: 'Player reaches layer 1 at (4,0)'
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
    given: 'Player on layer 1 platform at (4,0)',
    when: 'Player tries to move right to (7,0)',
    then: 'Player stops at edge (6,0)'
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
    given: 'Player on layer 1 at (6,0)',
    when: 'Player tries to move down to (6,1)',
    then: 'Player is blocked'
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
    given: 'Player on layer 1 at (6,0)',
    when: 'Player moves left to (4,0) then down through transition',
    then: 'Player returns to layer 0 at (4,3)'
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