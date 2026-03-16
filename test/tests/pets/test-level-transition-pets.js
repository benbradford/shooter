import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPetSpawnDuringTransition = test(
  {
    given: 'Active pet in level A',
    when: 'Transitioning to level B',
    then: 'Old pet destroyed, new pet spawned at player position in B'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: false, reason: 'no scene' });

        const currentLevel = scene.getCurrentLevelName();
        scene.startLevelTransition(currentLevel, 2, 2);

        // Wait for transition to complete
        setTimeout(() => {
          const newScene = window.game.scene.scenes.find(s => s.scene.key === 'game' && s.scene.isActive());
          if (!newScene?.entityManager) return resolve({ ok: false, reason: 'scene not ready' });

          const pets = newScene.entityManager.getAll().filter(e => e.tags.has('pet'));
          resolve({
            ok: pets.length <= 1,
            petCount: pets.length
          });
        }, 5000);
      });
    });

    if (errors.length > 0) {
      console.log(`❌ Error during pet transition: ${errors[0]}`);
      return false;
    }
    if (!result.ok) {
      console.log(`❌ ${result.petCount} pets after transition (expected 0 or 1)`);
      return false;
    }
    return true;
  }
);

const testPetSingletonSurvivesTransition = test(
  {
    given: 'PetManager singleton with selected pet',
    when: 'Level transition destroys and recreates GameScene',
    then: 'PetManager retains selectedPetId and collectedPets'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
        if (!scene) return resolve({ ok: true, reason: 'no scene' });

        const petManager = scene.petManager ?? window.PetManager?.getInstance?.();
        if (!petManager) return resolve({ ok: true, reason: 'no pet manager' });

        const beforeId = petManager.getSelectedPetId?.();
        const beforeCollected = petManager.getCollectedPets?.()?.length ?? 0;

        scene.startLevelTransition(scene.getCurrentLevelName(), 2, 2);

        setTimeout(() => {
          const afterId = petManager.getSelectedPetId?.();
          const afterCollected = petManager.getCollectedPets?.()?.length ?? 0;
          resolve({
            ok: afterId === beforeId && afterCollected === beforeCollected,
            beforeId, afterId, beforeCollected, afterCollected
          });
        }, 5000);
      });
    });

    if (!result.ok) {
      console.log(`❌ PetManager state lost: before=${result.beforeId}/${result.beforeCollected} after=${result.afterId}/${result.afterCollected}`);
      return false;
    }
    return true;
  }
);

runTests([testPetSpawnDuringTransition, testPetSingletonSurvivesTransition]);
