import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

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
  await page.goto('http://localhost:5173/?test=true', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for game to be ready...');
  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });
  
  await page.evaluate(playerCommands);
  
  console.log('Getting initial player position...');
  const initialPos = await page.evaluate(() => getPlayerPosition());
  console.log(`Initial position: (${initialPos.x}, ${initialPos.y})`);
  
  console.log('Simulating upward movement for 1 second...');
  await page.evaluate(() => setPlayerInput(0, -1, 1000));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Getting final player position...');
  const finalPos = await page.evaluate(() => getPlayerPosition());
  console.log(`Final position: (${finalPos.x}, ${finalPos.y})`);
  
  const movedUp = finalPos.y < initialPos.y;
  const distanceMoved = initialPos.y - finalPos.y;
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Player moved up: ${movedUp ? '✓' : '✗'}`);
  console.log(`Distance moved: ${distanceMoved.toFixed(0)} pixels`);
  console.log(`Movement via remote input: ${distanceMoved > 50 ? '✓' : '✗'}`);
  
  if (movedUp && distanceMoved > 50) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-player-movement.png' });
  console.log('\nScreenshot saved to tmp/test/screenshots/test-player-movement.png');
  
  await browser.close();
})();
