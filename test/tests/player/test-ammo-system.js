import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testFireDecreaseAmmo = test(
  {
    given: 'Player with full ammo',
    when: 'Player fires once',
    then: 'Ammo decreases by 1'
  },
  async (page) => {
    // Given: Player with full ammo
    const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
    
    // When: Player fires once
    await page.evaluate(() => fireSingleShot(0, -1));
    
    // Then: Ammo decreases by 1
    const ammo = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    return ammo === maxAmmo - 1;
  }
);

const testFireUntilOverheat = test(
  {
    given: 'Player with full ammo',
    when: 'Player holds fire to deplete ammo',
    then: 'Ammo reaches 0 and gun overheats'
  },
  async (page) => {
    // Given: Player with full ammo
    // When: Player holds fire to deplete ammo
    const { maxAmmo, initialWaitMs, cooldownMs } = await page.evaluate(() => ({
      maxAmmo: window.PLAYER_MAX_AMMO,
      initialWaitMs: window.INITIAL_AIM_WAIT_TIME_MS,
      cooldownMs: window.PLAYER_FIRE_COOLDOWN_MS
    }));
    const timeToDeplete = initialWaitMs + (maxAmmo * cooldownMs) + 100;
    
    await page.evaluate((duration) => {
      const remoteInput = enableRemoteInput();
      remoteInput.setAimInput(0, -1);
      remoteInput.setFirePressed(true);
      setTimeout(() => remoteInput.setFirePressed(false), duration);
    }, timeToDeplete);
    
    await new Promise(resolve => setTimeout(resolve, timeToDeplete + 100));
    
    // Then: Ammo reaches 0 and gun overheats
    const ammo = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    return ammo === 0;
  }
);

const testOverheatLock = test(
  {
    given: 'Player with overheated gun',
    when: 'Player tries to fire',
    then: 'No bullets spawn (gun is locked)'
  },
  async (page) => {
    // Given: Player with overheated gun
    const { maxAmmo, initialWaitMs, cooldownMs } = await page.evaluate(() => ({
      maxAmmo: window.PLAYER_MAX_AMMO,
      initialWaitMs: window.INITIAL_AIM_WAIT_TIME_MS,
      cooldownMs: window.PLAYER_FIRE_COOLDOWN_MS
    }));
    const timeToDeplete = initialWaitMs + (maxAmmo * cooldownMs) + 100;
    await page.evaluate((duration) => holdFire(0, -1, duration), timeToDeplete);
    
    // When: Player tries to fire
    await page.evaluate(() => fireWeapon(0, -1, 300));
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Then: No bullets spawn (gun is locked)
    const bulletCount = await page.evaluate(() => getBulletCount());
    return bulletCount === 0;
  }
);

const testAmmoRefills = test(
  {
    given: 'Player fires once',
    when: '3 seconds pass',
    then: 'Ammo refills back to full'
  },
  async (page) => {
    // Given: Player fires once
    await page.evaluate(() => waitForFullAmmo());
    const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
    await page.evaluate(() => fireSingleShot(0, -1));
    const before = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    
    // When: 3 seconds pass
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Then: Ammo refills back to full
    const after = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    return before === maxAmmo - 1 && after === maxAmmo;
  }
);

const testOverheatRefillDelay = test(
  {
    given: 'Player overheats gun',
    when: '6 seconds pass',
    then: 'Ammo refills back to full'
  },
  async (page) => {
    // Given: Player overheats gun
    const { maxAmmo, initialWaitMs, cooldownMs } = await page.evaluate(() => ({
      maxAmmo: window.PLAYER_MAX_AMMO,
      initialWaitMs: window.INITIAL_AIM_WAIT_TIME_MS,
      cooldownMs: window.PLAYER_FIRE_COOLDOWN_MS
    }));
    const timeToDeplete = initialWaitMs + (maxAmmo * cooldownMs) + 100;
    await page.evaluate((duration) => holdFire(0, -1, duration), timeToDeplete);
    
    // When: 6 seconds pass (4s overheat delay + 1.25s refill + buffer)
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Then: Ammo refills back to full
    const ammo = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    return ammo === maxAmmo;
  }
);

const testSmokeParticles = test(
  {
    given: 'Player with low ammo',
    when: 'Game updates',
    then: 'Smoke particles are emitting'
  },
  async (page) => {
    // Given: Player with low ammo
    const { maxAmmo, initialWaitMs, cooldownMs } = await page.evaluate(() => ({
      maxAmmo: window.PLAYER_MAX_AMMO,
      initialWaitMs: window.INITIAL_AIM_WAIT_TIME_MS,
      cooldownMs: window.PLAYER_FIRE_COOLDOWN_MS
    }));
    const shotsToLowAmmo = Math.floor(maxAmmo * 0.5);
    const timeToLowAmmo = initialWaitMs + (shotsToLowAmmo * cooldownMs) + 100;
    await page.evaluate((duration) => holdFire(0, -1, duration), timeToLowAmmo);
    
    // When: Game updates
    // Then: Smoke particles are emitting
    const emitting = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const overheat = player.get(window.OverheatSmokeComponent);
      return overheat.smokeParticles.emitting;
    });
    return emitting === true;
  }
);

const testOverheatParticles = test(
  {
    given: 'Player with overheated gun',
    when: 'Game updates',
    then: 'Both smoke and fire particles are emitting'
  },
  async (page) => {
    // Given: Player with overheated gun
    const { maxAmmo, initialWaitMs, cooldownMs } = await page.evaluate(() => ({
      maxAmmo: window.PLAYER_MAX_AMMO,
      initialWaitMs: window.INITIAL_AIM_WAIT_TIME_MS,
      cooldownMs: window.PLAYER_FIRE_COOLDOWN_MS
    }));
    const timeToDeplete = initialWaitMs + (maxAmmo * cooldownMs) + 100;
    await page.evaluate((duration) => holdFire(0, -1, duration), timeToDeplete);
    
    // When: Game updates
    // Then: Both smoke and fire particles are emitting
    const particles = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const overheat = player.get(window.OverheatSmokeComponent);
      return {
        smoke: overheat.smokeParticles.emitting,
        fire: overheat.fireParticles.emitting
      };
    });
    return particles.smoke === true && particles.fire === true;
  }
);

const testNoParticlesHighAmmo = test(
  {
    given: 'Player with full ammo',
    when: 'Game starts',
    then: 'No particles are emitting'
  },
  async (page) => {
    // Given: Player with full ammo
    await page.evaluate(() => waitForFullAmmo());
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // When: Game starts
    // Then: No particles are emitting
    const emitting = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const overheat = player.get(window.OverheatSmokeComponent);
      return overheat.smokeParticles.emitting;
    });
    return emitting === false;
  }
);

runTests({
  level: 'test/test-wall-collision',
  commands: ['test/interactions/player.js'],
  tests: [
    testFireDecreaseAmmo,
    testFireUntilOverheat,
    testOverheatLock,
    testAmmoRefills,
    testOverheatRefillDelay,
    testSmokeParticles,
    testOverheatParticles,
    testNoParticlesHighAmmo
  ],
  screenshotPath: 'tmp/test/screenshots/test-ammo-system.png'
});
