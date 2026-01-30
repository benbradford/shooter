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
  
  console.log('Getting initial bullet count...');
  const initialBullets = await page.evaluate(() => getBulletCount());
  console.log(`Initial bullets: ${initialBullets}`);
  
  console.log('Starting to fire weapon upward...');
  const firePromise = page.evaluate(() => fireWeapon(0, -1, 1000));
  
  // Wait a bit for first bullet to spawn
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('Checking bullet count while firing...');
  const duringBullets = await page.evaluate(() => getBulletCount());
  console.log(`Bullets while firing: ${duringBullets}`);
  
  // Wait for firing to complete
  await firePromise;
  
  const bulletsFired = duringBullets - initialBullets;
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Bullets fired: ${bulletsFired}`);
  console.log(`Weapon fired successfully: ${bulletsFired > 0 ? '✓' : '✗'}`);
  
  if (bulletsFired > 0) {
    console.log('\n✓ TEST PASSED');
  } else {
    console.log('\n✗ TEST FAILED');
  }
  
  await page.screenshot({ path: 'tmp/test/screenshots/test-shooting.png' });
  console.log('\nScreenshot saved to tmp/test/screenshots/test-shooting.png');
  
  await browser.close();
})();
