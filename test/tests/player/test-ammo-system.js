import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testFireDecreaseAmmo = test(
  {
    given: 'Player with full ammo',
    when: 'Player fires once',
    then: 'Ammo decreases by 1'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
    await page.evaluate(() => fireSingleShot(0, -1));
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
    when: 'Player holds fire for 10 seconds',
    then: 'Ammo reaches 0 and gun overheats'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    
    await page.evaluate(() => {
      const remoteInput = window.game.scene.scenes.find(s => s.scene.key === 'game')
        .entityManager.getFirst('player').get(window.RemoteInputComponent);
      remoteInput.setAimInput(0, -1);
      remoteInput.setFirePressed(true);
    });
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const ammo = await page.evaluate(() => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        const player = scene.entityManager.getFirst('player');
        return player.get(window.AmmoComponent).getCurrentAmmo();
      });
      if (ammo === 0) break;
    }
    
    await page.evaluate(() => {
      const remoteInput = window.game.scene.scenes.find(s => s.scene.key === 'game')
        .entityManager.getFirst('player').get(window.RemoteInputComponent);
      remoteInput.setFirePressed(false);
    });
    
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
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => holdFire(0, -1, 10000));
    await page.evaluate(() => fireWeapon(0, -1, 300));
    await new Promise(resolve => setTimeout(resolve, 400));
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
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => waitForFullAmmo());
    const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
    await page.evaluate(() => fireSingleShot(0, -1));
    const before = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      return player.get(window.AmmoComponent).getCurrentAmmo();
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
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
    when: '5 seconds pass',
    then: 'Ammo refills back to full'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    const maxAmmo = await page.evaluate(() => window.PLAYER_MAX_AMMO);
    await page.evaluate(() => holdFire(0, -1, 10000));
    await new Promise(resolve => setTimeout(resolve, 5000));
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
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => holdFire(0, -1, 5000));
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
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => holdFire(0, -1, 10000));
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
    await page.evaluate(() => waitForFullAmmo());
    await new Promise(resolve => setTimeout(resolve, 100));
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
