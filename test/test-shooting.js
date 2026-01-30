import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

/**
 * TEST: Weapon Firing in All Directions
 * 
 * GIVEN: A player in an empty 10x10 level with a weapon
 * WHEN: The player fires the weapon in each of 8 directions (up, down, left, right, and diagonals)
 *   AND: The player fires without explicit aim direction (using facing direction)
 * THEN: At least one bullet should spawn for each firing action
 */

const playerCommands = readFileSync('test/commands/player.js', 'utf-8');

(async () => {
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
  
  console.log('Navigating to game...');
  await page.goto('http://localhost:5173/?test=true&level=test/emptyLevel', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  await page.evaluate(playerCommands);
  
  const directions = [
    { name: 'up', dx: 0, dy: -1 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'right', dx: 1, dy: 0 },
    { name: 'up-left', dx: -1, dy: -1 },
    { name: 'up-right', dx: 1, dy: -1 },
    { name: 'down-left', dx: -1, dy: 1 },
    { name: 'down-right', dx: 1, dy: 1 }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const dir of directions) {
    console.log(`\nTesting ${dir.name} shooting...`);
    
    const initialBullets = await page.evaluate(() => getBulletCount());
    const firePromise = page.evaluate((dx, dy) => fireWeapon(dx, dy, 300), dir.dx, dir.dy);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const duringBullets = await page.evaluate(() => getBulletCount());
    await firePromise;
    
    const bulletsFired = duringBullets - initialBullets;
    const passed = bulletsFired > 0;
    results.push({ direction: dir.name, passed, bullets: bulletsFired });
    
    if (!passed) allPassed = false;
    
    console.log(`  Bullets fired: ${bulletsFired} - ${passed ? '✓' : '✗'}`);
  }
  
  // Test shooting in last facing direction (no aim input)
  console.log('\nTesting shooting in facing direction (no aim)...');
  
  // First move right to set facing direction
  await page.evaluate(() => setPlayerInput(1, 0, 200));
  
  // Then shoot without aim direction (should shoot right)
  const initialBullets = await page.evaluate(() => getBulletCount());
  const firePromise = page.evaluate(() => fireWeapon(0, 0, 300));
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const duringBullets = await page.evaluate(() => getBulletCount());
  await firePromise;
  
  const bulletsFired = duringBullets - initialBullets;
  const facingPassed = bulletsFired > 0;
  results.push({ direction: 'facing', passed: facingPassed, bullets: bulletsFired });
  
  if (!facingPassed) allPassed = false;
  
  console.log(`  Bullets fired: ${bulletsFired} - ${facingPassed ? '✓' : '✗'}`);
  
  console.log('\n=== TEST RESULTS ===');
  for (const result of results) {
    console.log(`${result.direction}: ${result.passed ? '✓' : '✗'} (${result.bullets} bullets)`);
  }
  
  if (allPassed) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-shooting.png' });
  console.log('\nScreenshot saved to tmp/test/screenshots/test-shooting.png');
  
  await browser.close();
  
  process.exit(allPassed ? 0 : 1);
})();
