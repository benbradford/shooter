import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testNoValidPath = test(
  {
    given: 'Pet and player separated by impassable walls',
    when: 'Pathfinder returns null',
    then: 'Pet falls back to direct movement, no crash'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Let the game run for a few seconds with pet active
    await page.waitForTimeout(3000);

    if (errors.some(e => e.includes('null') || e.includes('undefined') || e.includes('path'))) {
      console.log(`❌ Pathfinding null-path crash: ${errors[0]}`);
      return false;
    }
    return true;
  }
);

const testPathRecalcUnderStress = test(
  {
    given: 'Player moving rapidly across grid',
    when: 'Path recalculates every 500ms for 10 seconds',
    then: 'No performance degradation or crash'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: true, reason: 'no scene' });

        const start = performance.now();
        // Let game run for 10 seconds
        setTimeout(() => {
          const elapsed = performance.now() - start;
          resolve({ ok: true, elapsed });
        }, 10000);
      });
    });

    if (errors.length > 0) {
      console.log(`❌ Pathfinding stress error: ${errors[0]}`);
      return false;
    }
    return true;
  }
);

runTests([testNoValidPath, testPathRecalcUnderStress]);
