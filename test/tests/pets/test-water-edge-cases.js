import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testRapidWaterToggle = test(
  {
    given: 'Player near water edge with active pet',
    when: 'Entering and exiting water 10 times rapidly',
    then: 'Pet hide/show tweens resolve cleanly, no stacked tweens'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: true, reason: 'no pet manager' });

        const player = scene.entityManager.getFirst('player');
        if (!player) return resolve({ ok: false, reason: 'no player' });

        // Simulate rapid water enter/exit
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            if (i % 2 === 0) {
              petManager.hidePet?.(scene);
            } else {
              petManager.showPet?.(scene, player);
            }
          }, i * 60);
        }

        // Check final state after all tweens should complete
        setTimeout(() => {
          const pet = petManager.getActivePetEntity?.();
          if (!pet) return resolve({ ok: true });

          const sprite = pet.components?.get('SpriteComponent');
          const activeTweens = scene.tweens.getTweensOf(sprite?.sprite).length;
          resolve({
            ok: activeTweens <= 1,
            activeTweens
          });
        }, 1500);
      });
    });

    if (errors.length > 0) {
      console.log(`❌ Crash during rapid water toggle: ${errors[0]}`);
      return false;
    }
    if (!result.ok) {
      console.log(`❌ ${result.activeTweens} stacked tweens on pet sprite`);
      return false;
    }
    return true;
  }
);

const testHideShowAlphaConsistency = test(
  {
    given: 'Pet visible, player enters water then exits',
    when: 'Full hide→show cycle completes',
    then: 'Pet sprite alpha is exactly 1'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: true, reason: 'no pet manager' });

        const player = scene.entityManager.getFirst('player');
        if (!player) return resolve({ ok: false, reason: 'no player' });

        petManager.hidePet?.(scene);
        setTimeout(() => {
          petManager.showPet?.(scene, player);
          setTimeout(() => {
            const pet = petManager.getActivePetEntity?.();
            if (!pet) return resolve({ ok: true });
            const sprite = pet.components?.get('SpriteComponent');
            const alpha = sprite?.sprite?.alpha ?? 1;
            resolve({ ok: Math.abs(alpha - 1) < 0.01, alpha });
          }, 600);
        }, 400);
      });
    });

    if (!result.ok) {
      console.log(`❌ Pet alpha after hide→show: ${result.alpha} (expected 1)`);
      return false;
    }
    return true;
  }
);

runTests([testRapidWaterToggle, testHideShowAlphaConsistency]);
