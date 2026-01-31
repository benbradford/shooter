import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testManualAimOverridesAutoAim = test(
  {
    given: 'Enemy robot in view to the left',
    when: 'Player aims and shoots right (manual aim)',
    then: 'Bullet fires right, not at robot'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    
    // Fire right with manual aim for 300ms
    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const remoteInput = player.get(window.RemoteInputComponent);
      
      // Aim far right to trigger manual aim (needs to be > 70px from center)
      remoteInput.setAimInput(2, 0);
      remoteInput.setFirePressed(true);
    });
    
    // Wait for first shot delay (200ms) + a bit more
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const bullets = scene.entityManager.getByType('bullet');
      
      if (bullets.length === 0) return false;
      
      // Check bullet direction - should be going right (dirX > 0.9)
      const bullet = bullets[0];
      const projectile = bullet.require(window.ProjectileComponent);
      return projectile.dirX > 0.9 && Math.abs(projectile.dirY) < 0.1;
    });
    
    return result;
  }
);

const testAutoAimWithoutManualAim = test(
  {
    given: 'Enemy robot in view to the left',
    when: 'Player shoots without aiming (no manual aim input)',
    then: 'Bullet auto-aims at robot (fires left)'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    
    // Fire without manual aim
    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const remoteInput = player.get(window.RemoteInputComponent);
      
      // No aim input (stay at center), just fire
      remoteInput.setAimInput(0, 0);
      remoteInput.setFirePressed(true);
    });
    
    // Wait for first shot delay (200ms) + a bit more
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const bullets = scene.entityManager.getByType('bullet');
      
      if (bullets.length === 0) return false;
      
      // Check bullet direction - should be going left (dirX < -0.9)
      const bullet = bullets[0];
      const projectile = bullet.require(window.ProjectileComponent);
      return projectile.dirX < -0.9 && Math.abs(projectile.dirY) < 0.1;
    });
    
    return result;
  }
);

runTests({
  level: 'test/test-auto-aim',
  commands: ['test/interactions/player.js'],
  tests: [
    testManualAimOverridesAutoAim,
    testAutoAimWithoutManualAim
  ],
  screenshotPath: 'tmp/test/screenshots/test-auto-and-manual-aim.png'
});
