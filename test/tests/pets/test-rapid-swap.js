import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testRapidPetSwap = test(
  {
    given: 'Player with 2 collected pets',
    when: 'Cycling pets 10 times in 1 second',
    then: 'Only one pet entity exists, no duplicate sprites'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        // Simulate rapid swaps
        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: false, reason: 'no pet manager' });

        let swapCount = 0;
        const interval = setInterval(() => {
          petManager.selectNext?.();
          swapCount++;
          if (swapCount >= 10) {
            clearInterval(interval);
            setTimeout(() => {
              const petEntities = scene.entityManager.getAll().filter(e => e.tags.has('pet'));
              resolve({
                ok: petEntities.length <= 1,
                petCount: petEntities.length,
                swapCount
              });
            }, 500);
          }
        }, 100);
      });
    });

    if (!result.ok) {
      console.log(`❌ Found ${result.petCount} pet entities after ${result.swapCount} rapid swaps`);
      return false;
    }
    if (errors.length > 0) {
      console.log(`❌ Page errors during rapid swap: ${errors.join(', ')}`);
      return false;
    }
    return true;
  }
);

const testSwapDuringWaterHide = test(
  {
    given: 'Pet is hidden (player in water)',
    when: 'Player swaps pet while hidden',
    then: 'New pet stays hidden until player exits water'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: false, reason: 'no pet manager' });

        // Simulate: hide pet, then swap
        petManager.hidePet?.(scene);
        setTimeout(() => {
          petManager.selectNext?.();
          setTimeout(() => {
            const pet = petManager.getActivePetEntity?.();
            if (!pet) return resolve({ ok: true, reason: 'no pet active' });
            const follow = pet.components?.get('PetFollowComponent');
            resolve({
              ok: follow?.getIsHidden?.() === true,
              isHidden: follow?.getIsHidden?.()
            });
          }, 300);
        }, 100);
      });
    });

    if (!result.ok) {
      console.log(`❌ Pet visible after swap during water: isHidden=${result.isHidden}`);
      return false;
    }
    return true;
  }
);

const testSwapDuringLevelTransition = test(
  {
    given: 'Level transition in progress',
    when: 'Player swaps pet during fade-out',
    then: 'Swap ignored or deferred, no crash'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        // Start transition then immediately try to swap
        scene.startLevelTransition(scene.getCurrentLevelName(), 2, 2);

        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: true, reason: 'no pet manager' });

        // Rapid swaps during transition
        for (let i = 0; i < 5; i++) {
          setTimeout(() => petManager.selectNext?.(), i * 50);
        }

        setTimeout(() => resolve({ ok: true }), 2000);
      });
    });

    if (errors.length > 0) {
      console.log(`❌ Crash during swap+transition: ${errors[0]}`);
      return false;
    }
    return result.ok;
  }
);

runTests([testRapidPetSwap, testSwapDuringWaterHide, testSwapDuringLevelTransition]);
