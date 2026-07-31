import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const SAMPLE_INTERVAL_MS = 100;
const SAMPLE_COUNT = 8;
const SETTLE_SAMPLE_COUNT = 40;
const MIN_HORIZONTAL_TRAVEL_PX = 1;
const MIN_SQUASH_RANGE = 0.2;
const SETTLED_SCALE_X = 1;
const SETTLED_TOLERANCE = 0.02;

async function breakVaseAndSampleCoins(page, breakableId, sampleCount = SAMPLE_COUNT) {
  await page.waitForFunction((id) => {
    const scene = window.game?.scene?.scenes?.find(s => s.scene.key === 'game');
    return scene?.entityManager?.getFirst('player') && scene.entityManager.getFirst(id);
  }, { timeout: 15000 }, breakableId);

  return page.evaluate((intervalMs, sampleCount, id) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const vase = scene.entityManager.getFirst(id);
    const coinsBefore = new Set(scene.entityManager.getAll().filter(e => e.tags.has('coin')));
    vase.require(window.BreakableComponent).takeDamage(9999);

    const coins = scene.entityManager.getAll().filter(e => e.tags.has('coin') && !coinsBefore.has(e));
    const samples = [];

    const takeSample = () => {
      samples.push({
        timeMs: performance.now(),
        coins: coins.map(coin => {
          const transform = coin.get(window.TransformComponent);
          const sprite = coin.get(window.SpriteComponent);
          return { x: transform.x, scaleX: sprite.sprite.scaleX, visualScaleX: sprite.visualScaleX };
        })
      });
    };

    takeSample();

    return new Promise(resolve => {
      const interval = setInterval(() => {
        takeSample();
        if (samples.length > sampleCount) {
          clearInterval(interval);
          resolve({ coinCount: coins.length, samples });
        }
      }, intervalMs);
    });
  }, SAMPLE_INTERVAL_MS, sampleCount, breakableId);
}

const squashRange = (samples, coinIndex) => {
  const values = samples.map(sample => sample.coins[coinIndex].visualScaleX);
  return Math.max(...values) - Math.min(...values);
};

const testCoinsSquashAndStretch = test(
  {
    given: 'A legendary breakable that drops coins',
    when: 'The breakable is destroyed',
    then: 'Each coin squashes and stretches horizontally as it flies'
  },
  async (page) => {
    const { coinCount, samples } = await breakVaseAndSampleCoins(page, 'breakable0');
    console.log('  Coins spawned:', coinCount);
    if (coinCount === 0) {
      console.log('  FAIL: no coins spawned');
      return false;
    }

    const ranges = samples[0].coins.map((_, i) => squashRange(samples, i));
    const notSquashing = ranges.filter(range => range < MIN_SQUASH_RANGE).length;
    console.log('  Squash range per coin:', ranges.map(r => r.toFixed(2)).join(', '));
    if (notSquashing > 0) {
      console.log(`  FAIL: ${notSquashing} of ${coinCount} coins did not squash`);
      return false;
    }
    return true;
  }
);

const testSquashDrivesRenderedScale = test(
  {
    given: 'Coins spinning via a horizontal squash',
    when: 'The coin sprite is rendered',
    then: 'The rendered sprite scaleX narrows below its resting width'
  },
  async (page) => {
    const { coinCount, samples } = await breakVaseAndSampleCoins(page, 'breakable1');
    if (coinCount === 0) {
      console.log('  FAIL: no coins spawned');
      return false;
    }

    let notNarrowed = 0;
    for (let i = 0; i < samples[0].coins.length; i++) {
      const scaleXs = samples.map(sample => sample.coins[i].scaleX);
      const minScaleX = Math.min(...scaleXs);
      const maxScaleX = Math.max(...scaleXs);
      if (!(minScaleX < maxScaleX)) {
        notNarrowed++;
        console.log(`  Coin ${i}: rendered scaleX constant at ${minScaleX.toFixed(4)}`);
      }
    }

    console.log(`  Coins with constant rendered scaleX: ${notNarrowed} of ${coinCount}`);
    return notNarrowed === 0;
  }
);

const testSpinSlowsAndSettlesFaceOn = test(
  {
    given: 'A legendary breakable that drops coins',
    when: 'Time passes after the coins are emitted',
    then: 'The squash oscillation decays and each coin settles at full width'
  },
  async (page) => {
    const { coinCount, samples } = await breakVaseAndSampleCoins(page, 'breakable2', SETTLE_SAMPLE_COUNT);
    if (coinCount === 0) {
      console.log('  FAIL: no coins spawned');
      return false;
    }

    const lastIndex = samples.length - 1;
    const midIndex = Math.floor(samples.length / 2);
    let notDecaying = 0;
    let notSettled = 0;

    for (let i = 0; i < samples[0].coins.length; i++) {
      const earlyRange = squashRange(samples.slice(0, midIndex), i);
      const lateRange = squashRange(samples.slice(midIndex), i);
      if (!(lateRange < earlyRange)) {
        notDecaying++;
        console.log(`  Coin ${i}: early range=${earlyRange.toFixed(3)} late range=${lateRange.toFixed(3)} (not decaying)`);
      }

      const finalScaleX = samples[lastIndex].coins[i].visualScaleX;
      if (Math.abs(finalScaleX - SETTLED_SCALE_X) > SETTLED_TOLERANCE) {
        notSettled++;
        console.log(`  Coin ${i}: settled at scaleX=${finalScaleX.toFixed(3)} (expected ~${SETTLED_SCALE_X})`);
      }
    }

    console.log(`  Coins not decaying: ${notDecaying} of ${coinCount}, not settled face-on: ${notSettled} of ${coinCount}`);
    return notDecaying === 0 && notSettled === 0;
  }
);

const testSpinDirectionMatchesEmitDirection = test(
  {
    given: 'A legendary breakable that drops coins',
    when: 'Coins are emitted left and right',
    then: 'Each coin spins in the direction it was emitted'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game?.scene?.scenes?.find(s => s.scene.key === 'game');
      return scene?.entityManager?.getFirst('player') && scene.entityManager.getFirst('breakable3');
    }, { timeout: 15000 });

    const result = await page.evaluate((minTravelPx) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const vase = scene.entityManager.getFirst('breakable3');
      const coinsBefore = new Set(scene.entityManager.getAll().filter(e => e.tags.has('coin')));
      vase.require(window.BreakableComponent).takeDamage(9999);

      const coins = scene.entityManager.getAll().filter(e => e.tags.has('coin') && !coinsBefore.has(e));
      const readPhase = coin => coin.get(window.CoinComponent).getSpinPhaseRad();
      const startX = coins.map(coin => coin.get(window.TransformComponent).x);
      const startPhase = coins.map(readPhase);

      return new Promise(resolve => {
        setTimeout(() => {
          resolve(coins.map((coin, i) => ({
            dx: coin.get(window.TransformComponent).x - startX[i],
            dPhase: readPhase(coin) - startPhase[i]
          })).filter(sample => Math.abs(sample.dx) >= minTravelPx));
        }, 100);
      });
    }, MIN_HORIZONTAL_TRAVEL_PX);

    const mismatched = result.filter(sample => Math.sign(sample.dx) !== Math.sign(sample.dPhase));
    mismatched.forEach(sample => {
      console.log(`  dx=${sample.dx.toFixed(1)} dPhase=${sample.dPhase.toFixed(3)} (direction mismatch)`);
    });

    console.log(`  Coins checked: ${result.length}, mismatched: ${mismatched.length}`);
    if (result.length === 0) {
      console.log('  FAIL: no coins travelled horizontally');
      return false;
    }
    return mismatched.length === 0;
  }
);

runTests({
  level: 'test/test-coin-spin',
  commands: ['test/interactions/player.js'],
  tests: [testCoinsSquashAndStretch, testSquashDrivesRenderedScale, testSpinSlowsAndSettlesFaceOn, testSpinDirectionMatchesEmitDirection],
  screenshotPath: 'tmp/test/screenshots/test-coin-spin.png'
});
