import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const SAMPLE_INTERVAL_MS = 100;
const SAMPLE_COUNT = 9;
const MAX_SLOWED_SPEED_RATIO = 0.7;

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const scene = window.game?.scene?.scenes?.find(s => s.scene.key === 'game');
    return !!scene?.entityManager?.getFirst('player');
  }, { timeout: 15000 });
}

async function sampleShardAngles(page) {
  return page.evaluate((intervalMs, sampleCount) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const breakable = scene.entityManager.getAll().find(e => e.tags.has('breakable'));
    if (!breakable) return null;

    const spritesBefore = new Set(scene.children.list);
    breakable.get(window.BreakableComponent).takeDamage(1000);

    const shards = scene.children.list.filter(child =>
      !spritesBefore.has(child) && child.texture && child.texture.key === 'dungeon_vase'
    );
    if (shards.length === 0) return null;

    const samples = [];
    const startTime = scene.time.now;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        samples.push({
          elapsedMs: scene.time.now - startTime,
          angles: shards.map(shard => shard.angle)
        });
        if (samples.length >= sampleCount) {
          clearInterval(interval);
          resolve(samples);
        }
      }, intervalMs);
    });
  }, SAMPLE_INTERVAL_MS, SAMPLE_COUNT);
}

function angularSpeedDegPerSec(fromSample, toSample) {
  const elapsedSec = (toSample.elapsedMs - fromSample.elapsedMs) / 1000;
  if (elapsedSec <= 0) return 0;

  const totalAngleChange = toSample.angles.reduce(
    (sum, angle, index) => sum + Math.abs(angle - fromSample.angles[index]),
    0
  );
  return totalAngleChange / elapsedSec;
}

const testShardSpinSlowsDown = test(
  {
    given: 'A breakable that has been destroyed',
    when: 'Its shards fly apart and spin',
    then: 'Shard spin speed decreases over time'
  },
  async (page) => {
    await waitForPlayer(page);

    const samples = await sampleShardAngles(page);
    if (!samples || samples.length < SAMPLE_COUNT) {
      console.log('[INFO] Failed to sample shard angles');
      return false;
    }

    const earlySpeed = angularSpeedDegPerSec(samples[0], samples[2]);
    const laterSpeed = angularSpeedDegPerSec(samples[SAMPLE_COUNT - 3], samples[SAMPLE_COUNT - 1]);

    if (earlySpeed === 0) {
      console.log('[INFO] Shards did not rotate at all');
      return false;
    }

    const ratio = laterSpeed / earlySpeed;
    console.log(`[INFO] Early spin ${earlySpeed.toFixed(1)} deg/s, later spin ${laterSpeed.toFixed(1)} deg/s, ratio ${ratio.toFixed(2)}`);

    return ratio < MAX_SLOWED_SPEED_RATIO;
  }
);

runTests({
  level: 'test/test-breakables',
  commands: ['test/interactions/player.js'],
  tests: [testShardSpinSlowsDown],
  screenshotPath: 'tmp/test/screenshots/test-breakable-shard-spin.png'
});
