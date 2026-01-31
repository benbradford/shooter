import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { test } from '../helpers/test-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');

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

async function testTransitionEntry(page) {
  const reached = await moveToRow(page, 1);
  
  const result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    const cell = scene.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    return { 
      col: gridPos.currentCell.col,
      row: gridPos.currentCell.row,
      isTransition: cell?.isTransition ?? false,
      layer: gridPos.currentLayer 
    };
  });
  
  const passed = reached && result.isTransition && result.col === 4 && result.row === 1;
  
  return {
    passed,
    given: 'Player at (4,3) with transition cell at (4,1)',
    when: 'Player moves up to row 1',
    then: `Player ${passed ? 'enters' : 'fails to enter'} transition cell at (4,1)`
  };
}

async function testTransitionHorizontalBlock(page) {
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
  
  const passed = endPos.col === startPos.col && endPos.row === startPos.row;
  
  return {
    passed,
    given: 'Player in transition cell at (4,1)',
    when: 'Player tries to move right',
    then: `Player ${passed ? 'is blocked' : 'moves horizontally (should be blocked)'}`
  };
}

async function testTransitionToLayer1(page) {
  const reached = await moveToRow(page, 0);
  
  const result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const passed = reached && result.layer === 1 && result.col === 4 && result.row === 0;
  
  return {
    passed,
    given: 'Player in transition cell at (4,1)',
    when: 'Player moves up to row 0',
    then: `Player ${passed ? 'reaches' : 'fails to reach'} layer 1 at (4,0)`
  };
}

async function testLayer1EdgeBlock(page) {
  await moveToCol(page, 7);
  
  const result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const passed = result.col === 6 && result.row === 0;
  
  return {
    passed,
    given: 'Player on layer 1 platform at (4,0)',
    when: 'Player tries to move right to (7,0)',
    then: `Player ${passed ? 'stops at edge (6,0)' : 'moves past edge (should stop at 6,0)'}`
  };
}

async function testLayer1EntryBlock(page) {
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
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const passed = endPos.col === startPos.col && endPos.row === startPos.row;
  
  return {
    passed,
    given: 'Player on layer 1 at (6,0)',
    when: 'Player tries to move down to (6,1)',
    then: `Player ${passed ? 'is blocked' : 'moves down (should be blocked)'}`
  };
}

async function testTransitionExit(page) {
  const reachedCol = await moveToCol(page, 4);
  const reachedRow = await moveToRow(page, 3);
  
  const result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const passed = reachedCol && reachedRow && result.layer === 0 && result.col === 4 && result.row === 3;
  
  return {
    passed,
    given: 'Player on layer 1 at (6,0)',
    when: 'Player moves left to (4,0) then down through transition',
    then: `Player ${passed ? 'returns to' : 'fails to return to'} layer 0 at (4,3)`
  };
}

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,720']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  page.on('console', msg => {
    const text = msg.text();
    const isVerbose = process.env.VERBOSE === 'true';
    
    if (text.startsWith('[DEBUG]')) {
      if (isVerbose) console.log(text);
      return;
    }
    if (text.startsWith('[TEST]') || text.startsWith('[INFO]')) {
      console.log(text);
    }
  });
  
  await page.goto('http://localhost:5173/?test=true&level=test/test-player-transition', { 
    waitUntil: 'networkidle2' 
  });
  
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  await page.evaluate(playerCommands);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const tests = [
    { name: 'Transition Entry', fn: testTransitionEntry },
    { name: 'Transition Horizontal Block', fn: testTransitionHorizontalBlock },
    { name: 'Transition to Layer 1', fn: testTransitionToLayer1 },
    { name: 'Layer 1 Edge Block', fn: testLayer1EdgeBlock },
    { name: 'Layer 1 Entry Block', fn: testLayer1EntryBlock },
    { name: 'Transition Exit', fn: testTransitionExit }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await test.fn(page);
    
    console.log(`GIVEN: ${result.given}, WHEN: ${result.when}, THEN: ${result.then} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    
    if (!result.passed) allPassed = false;
  }
  
  console.log(allPassed ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-player-transition.png' });
  
  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }
  
  process.exit(allPassed ? 0 : 1);
})();
