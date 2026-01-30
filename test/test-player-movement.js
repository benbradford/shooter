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
  
  console.log('Waiting for game to load...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.evaluate(playerCommands);
  
  console.log('Getting initial player position...');
  const initialPos = await page.evaluate(() => getPlayerPosition());
  console.log(`Initial position: (${initialPos.x}, ${initialPos.y})`);
  
  console.log('Moving player up by 100 pixels...');
  await page.evaluate(() => movePlayer(0, -100));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Getting final player position...');
  const finalPos = await page.evaluate(() => getPlayerPosition());
  console.log(`Final position: (${finalPos.x}, ${finalPos.y})`);
  
  const movedUp = finalPos.y < initialPos.y;
  const movedCorrectAmount = Math.abs((initialPos.y - finalPos.y) - 100) < 1;
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Player moved up: ${movedUp ? '✓' : '✗'}`);
  console.log(`Moved correct amount: ${movedCorrectAmount ? '✓' : '✗'}`);
  console.log(`Expected Y: ${initialPos.y - 100}, Actual Y: ${finalPos.y}`);
  
  if (movedUp && movedCorrectAmount) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'test/test-result.png' });
  console.log('\nScreenshot saved to test/test-result.png');
  
  await browser.close();
})();
