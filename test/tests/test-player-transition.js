import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { outputGWT } from '../helpers/gwt-helper.js';

const playerCommands = readFileSync('test/interactions/player.js', 'utf-8');
const logFile = 'tmp/test/logs/transition-test.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  appendFileSync(logFile, logMessage);
}

// Clear log file at start
writeFileSync(logFile, `=== Test started at ${new Date().toISOString()} ===\n`);

// Helper to move player to specific row
async function moveToRow(page, targetRow, maxTimeMs = 5000) {
  const startTime = Date.now();
  const cellSize = 64;
  const targetY = targetRow * cellSize + cellSize / 2 - 10; // 10px above center
  const threshold = 5; // pixels - must be close to center
  
  const startPos = await page.evaluate(() => getPlayerPosition());
  log(`Moving from y=${startPos.y.toFixed(0)} to row ${targetRow} (y=${targetY})`);
  
  const dy = targetY - startPos.y;
  const dirY = dy > 0 ? 1 : -1;
  
  let checkCount = 0;
  while (Date.now() - startTime < maxTimeMs) {
    await new Promise(resolve => setTimeout(resolve, 5));
    
    let currentPos;
    try {
      currentPos = await page.evaluate(() => getPlayerPosition());
    } catch (error) {
      log(`Error getting position: ${error.message}`);
      break;
    }
    
    checkCount++;
    
    // Re-apply input every 100ms to maintain movement
    if (checkCount % 20 === 0) {
      page.evaluate((y) => setPlayerInput(0, y, 10000), dirY);
    }
    
    if (checkCount % 10 === 0) {
      log(`  Check ${checkCount}: y=${currentPos.y.toFixed(0)}, target=${targetY}, diff=${Math.abs(currentPos.y - targetY).toFixed(0)}`);
    }
    
    if (Math.abs(currentPos.y - targetY) < threshold) {
      log(`Reached row ${targetRow} at y=${currentPos.y.toFixed(0)} after ${checkCount} checks`);
      await page.evaluate(() => setPlayerInput(0, 0, 0));
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  log(`Timeout after ${checkCount} checks`);
  await page.evaluate(() => setPlayerInput(0, 0, 0));
  return false;
}

// Helper to move player to specific column
async function moveToCol(page, targetCol, maxTimeMs = 5000) {
  const startTime = Date.now();
  const cellSize = 64;
  const targetX = targetCol * cellSize + cellSize / 2;
  const threshold = 5; // pixels - must be close to center
  
  const startPos = await page.evaluate(() => getPlayerPosition());
  log(`Moving from x=${startPos.x.toFixed(0)} to col ${targetCol} (x=${targetX})`);
  
  const dx = targetX - startPos.x;
  const dirX = dx > 0 ? 1 : -1;
  
  let checkCount = 0;
  let lastX = startPos.x;
  let stuckCount = 0;
  
  while (Date.now() - startTime < maxTimeMs) {
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const currentPos = await page.evaluate(() => getPlayerPosition());
    checkCount++;
    
    // Check if stuck (not moving)
    if (Math.abs(currentPos.x - lastX) < 1) {
      stuckCount++;
      if (stuckCount > 40) { // Stuck for 200ms
        log(`Player stuck at x=${currentPos.x.toFixed(0)}, stopping`);
        await page.evaluate(() => setPlayerInput(0, 0, 0));
        return false;
      }
    } else {
      stuckCount = 0;
      lastX = currentPos.x;
    }
    
    // Re-apply input every 100ms to maintain movement
    if (checkCount % 20 === 0) {
      page.evaluate((x) => setPlayerInput(x, 0, 10000), dirX);
    }
    
    if (checkCount % 10 === 0) {
      log(`  Check ${checkCount}: x=${currentPos.x.toFixed(0)}, target=${targetX}, diff=${Math.abs(currentPos.x - targetX).toFixed(0)}`);
    }
    
    if (Math.abs(currentPos.x - targetX) < threshold) {
      log(`Reached col ${targetCol} at x=${currentPos.x.toFixed(0)} after ${checkCount} checks`);
      await page.evaluate(() => setPlayerInput(0, 0, 0));
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  
  log(`Timeout after ${checkCount} checks`);
  await page.evaluate(() => setPlayerInput(0, 0, 0));
  return false;
}

(async () => {
  outputGWT({
    title: 'Player Transition Test',
    given: 'Player at (4,3) with transition cells at (3,1) and (4,1) leading to layer 1 platform',
    when: [
      'Test 1: Move to transition cell (4,1)',
      'Test 2: Try to exit transition horizontally to (5,1)',
      'Test 3: Move up from transition to layer 1 at (4,0)',
      'Test 4: Try to move right off platform to (7,0)',
      'Test 5: Try to move down to (6,1) without transition',
      'Test 6: Move left to (4,0) then down through transition to (4,3)'
    ],
    then: [
      'Player enters transition cell',
      'Player blocked - cannot exit transition horizontally',
      'Player reaches layer 1',
      'Player blocked at edge (6,0)',
      'Player blocked - cannot enter layer 1 from below',
      'Player exits layer 1 via transition back to layer 0'
    ]
  });
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1280,720']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[TEST]')) {
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
  
  let allTestsPassed = true;
  
  // Test 1: CAN ENTER TRANSITION - move to (4,1)
  console.log('\n=== Test 1: Move to transition cell (4,1) ===');
  const reachedTransition = await moveToRow(page, 1);
  
  const test1Result = await page.evaluate(() => {
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
  
  console.log(`Reached transition: ${reachedTransition ? '✓' : '✗'}, position: (${test1Result.col}, ${test1Result.row}), isTransition: ${test1Result.isTransition}, layer: ${test1Result.layer}`);
  if (!reachedTransition || !test1Result.isTransition || test1Result.col !== 4 || test1Result.row !== 1) allTestsPassed = false;
  
  // Test 2: CANNOT EXIT TRANSITION HORIZONTALLY - try to move to (5,1)
  console.log('\n=== Test 2: Try to exit transition horizontally to (5,1) ===');
  const startPos2 = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
  
  page.evaluate(() => setPlayerInput(1, 0, 1000)); // Try to move right
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.evaluate(() => setPlayerInput(0, 0, 0)); // Stop
  
  const test2Result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
  
  const blocked2 = test2Result.col === startPos2.col && test2Result.row === startPos2.row;
  console.log(`Blocked: ${blocked2 ? '✓' : '✗'}, position: (${test2Result.col}, ${test2Result.row})`);
  if (!blocked2) allTestsPassed = false;
  
  // Test 3: CAN ENTER LAYER 1 FROM TRANSITION - move to (4,0)
  console.log('\n=== Test 3: Move up to layer 1 at (4,0) ===');
  const reachedLayer1 = await moveToRow(page, 0);
  
  const test3Result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  console.log(`Reached layer 1: ${reachedLayer1 ? '✓' : '✗'}, position: (${test3Result.col}, ${test3Result.row}), layer: ${test3Result.layer}`);
  if (!reachedLayer1 || test3Result.layer !== 1 || test3Result.col !== 4 || test3Result.row !== 0) allTestsPassed = false;
  
  // Test 4: CANNOT EXIT LAYER 1 HORIZONTALLY - try to move to (7,0), should stop at (6,0)
  console.log('\n=== Test 4: Try to move right to (7,0) ===');
  const attemptCol7 = await moveToCol(page, 7);
  
  const test4Result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const stoppedAt6 = test4Result.col === 6 && test4Result.row === 0;
  console.log(`Blocked at edge: ${stoppedAt6 ? '✓' : '✗'}, position: (${test4Result.col}, ${test4Result.row}), layer: ${test4Result.layer}`);
  if (!stoppedAt6) allTestsPassed = false;
  
  // Test 5: CANNOT ENTER LAYER 1 FROM BELOW - try to move to (6,1), should stay at (6,0)
  console.log('\n=== Test 5: Try to move down to (6,1) ===');
  const startPos5 = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
  
  page.evaluate(() => setPlayerInput(0, 1, 1000)); // Try to move down
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.evaluate(() => setPlayerInput(0, 0, 0)); // Stop
  
  const test5Result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  const blocked5 = test5Result.col === startPos5.col && test5Result.row === startPos5.row;
  console.log(`Blocked: ${blocked5 ? '✓' : '✗'}, position: (${test5Result.col}, ${test5Result.row}), layer: ${test5Result.layer}`);
  if (!blocked5) allTestsPassed = false;
  
  // Test 6: CAN EXIT LAYER 1 VIA TRANSITION - move to (4,0) then down to (4,3)
  console.log('\n=== Test 6: Move left to (4,0) then down to (4,3) ===');
  const reachedTransitionCol = await moveToCol(page, 4);
  const reachedLayer0 = await moveToRow(page, 3);
  
  const test6Result = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, layer: gridPos.currentLayer };
  });
  
  console.log(`Returned to layer 0: ${reachedLayer0 ? '✓' : '✗'}, position: (${test6Result.col}, ${test6Result.row}), layer: ${test6Result.layer}`);
  if (!reachedTransitionCol || !reachedLayer0 || test6Result.layer !== 0 || test6Result.col !== 4 || test6Result.row !== 3) allTestsPassed = false;
  
  if (allTestsPassed) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-player-transition.png' });
  
  try {
    await browser.close();
  } catch (error) {
    // Ignore browser close errors
  }
  
  process.exit(allTestsPassed ? 0 : 1);
})();
