import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

export async function runTests({ level, commands = [], tests, screenshotPath }) {
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

  await page.goto(`http://localhost:5173/?test=true&level=${level}`, { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  for (const commandFile of commands) {
    const commandCode = readFileSync(commandFile, 'utf-8');
    await page.evaluate(commandCode);
  }

  let allPassed = true;

  for (const testFn of tests) {
    const result = await testFn(page);
    console.log(`GIVEN: ${result.given}, WHEN: ${result.when}, THEN: ${result.then} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    if (!result.passed) allPassed = false;
  }

  console.log(allPassed ? '\n✓ ALL TESTS PASSED' : '\n✗ SOME TESTS FAILED');

  await page.screenshot({ path: screenshotPath });

  try {
    await browser.close();
  } catch (error) {
    // Ignore
  }

  process.exit(allPassed ? 0 : 1);
}
