import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';

export async function runTests({ level, commands = [], tests, screenshotPath }) {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS === 'true',
    args: [
      '--window-size=1280,720',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => {
    const text = msg.text();
    
    if (text.startsWith('[DEBUG]') || text.startsWith('[TEST]')) {
      if (process.env.VERBOSE === 'true' || process.env.VERBOSE === '1') {
        console.log(text);
      }
      return;
    }
    
    if (text.startsWith('[INFO]')) {
      console.log(text);
    }
  });

  await page.goto(`http://localhost:5173/?test=true&level=${level}`, { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => {
    return window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
  }, { timeout: 5000 });

  // Inject VERBOSE flag into browser context
  await page.evaluate((isVerbose) => {
    window.VERBOSE = isVerbose;
  }, process.env.VERBOSE === 'true' || process.env.VERBOSE === '1');

  for (const commandFile of commands) {
    const commandCode = readFileSync(commandFile, 'utf-8');
    await page.evaluate(commandCode);
  }

  // Filter tests by name if TEST_NAME env var is set
  const testNameFilter = process.env.TEST_NAME;
  const testsToRun = testNameFilter
    ? tests.filter(testFn => {
        const testName = `${testFn.given} ${testFn.when} ${testFn.then}`;
        return testName.toLowerCase().includes(testNameFilter.toLowerCase());
      })
    : tests;

  if (testNameFilter && testsToRun.length === 0) {
    console.log(`No tests found matching: "${testNameFilter}"`);
    await browser.close();
    process.exit(1);
  }

  if (testNameFilter) {
    console.log(`Running ${testsToRun.length} test(s) matching: "${testNameFilter}"\n`);
  }

  let allPassed = true;

  for (const testFn of testsToRun) {
    const testTitle = `GIVEN: ${testFn.given}, WHEN: ${testFn.when}, THEN: ${testFn.then}`;
    
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    const spinner = setInterval(() => {
      process.stdout.write(`\r${spinnerFrames[spinnerIndex]} `);
      spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 80);
    
    const result = await testFn(page);
    
    clearInterval(spinner);
    process.stdout.write(`\r${testTitle} - ${result.passed ? '✓ PASSED' : '✗ FAILED'}\n`);
    if (!result.passed) allPassed = false;
  }

  process.stdout.write(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');

  await page.screenshot({ path: screenshotPath });

  try {
    await browser.close();
  } catch (error) {
    // Ignore
  }

  process.exit(allPassed ? 0 : 1);
}
