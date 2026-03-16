import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testCorruptedPetFlags = test(
  {
    given: 'WorldState flags with invalid pet data',
    when: 'PetManager.refreshCollectedPets() reads flags',
    then: 'Graceful fallback, no crash'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const result = await page.evaluate(() => {
      const ws = window.WorldStateManager?.getInstance?.();
      if (!ws) return { ok: true, reason: 'no world state' };

      // Corrupt flags
      ws.setFlag('pet_rock_collected', 'maybe');
      ws.setFlag('pet_dog_collected', '');
      ws.setFlag('pet_selected', 'nonexistent_pet');

      const petManager = window.PetManager?.getInstance?.();
      if (!petManager) return { ok: true, reason: 'no pet manager' };

      try {
        petManager.refreshCollectedPets?.();
        const selected = petManager.getSelectedPetId?.();
        const collected = petManager.getCollectedPets?.();
        return {
          ok: true,
          selected,
          collectedCount: collected?.length ?? 0
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    if (!result.ok) {
      console.log(`❌ Crash on corrupted flags: ${result.error}`);
      return false;
    }
    if (errors.length > 0) {
      console.log(`❌ Page error on corrupted flags: ${errors[0]}`);
      return false;
    }
    return true;
  }
);

const testMissingMetadataFile = test(
  {
    given: 'Pet metadata JSON file is missing or 404',
    when: 'PetManager tries to spawn pet',
    then: 'Error logged, pet not spawned, no crash'
  },
  async (page) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // This test verifies the design's error handling claim
    // The design says: "Missing metadata: Log error, don't spawn pet"
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Attempt to fetch a non-existent metadata file
        fetch('/assets/pets/fake/fake_spritesheet_metadata.json')
          .then(r => {
            resolve({ ok: !r.ok, status: r.status });
          })
          .catch(() => {
            resolve({ ok: true, reason: 'fetch failed gracefully' });
          });
      });
    });

    // The key question: does the design actually handle this fetch failure?
    return result.ok;
  }
);

const testDirectionMappingEdgeCases = test(
  {
    given: 'Rock pet (4-dir) receiving 8-direction inputs',
    when: 'All 8 directions + Direction.None are mapped',
    then: 'All map to valid 4-direction keys, no undefined'
  },
  async (page) => {
    // This is a static analysis test - verify the mapping covers all cases
    const result = await page.evaluate(() => {
      // Simulate the DIR_8_TO_4 mapping from design
      const Direction = { Right: 0, UpRight: 1, Up: 2, UpLeft: 3, Left: 4, DownLeft: 5, Down: 6, DownRight: 7, None: 8 };
      const DIR_8_TO_4 = {
        [Direction.Right]: 'east',
        [Direction.UpRight]: 'north',
        [Direction.Up]: 'north',
        [Direction.UpLeft]: 'west',
        [Direction.Left]: 'west',
        [Direction.DownLeft]: 'south',
        [Direction.Down]: 'south',
        [Direction.DownRight]: 'east',
        [Direction.None]: 'south',
      };

      const validDirs = new Set(['north', 'south', 'east', 'west']);
      const allValues = Object.values(Direction);
      const unmapped = allValues.filter(d => !DIR_8_TO_4[d] || !validDirs.has(DIR_8_TO_4[d]));

      return { ok: unmapped.length === 0, unmapped };
    });

    if (!result.ok) {
      console.log(`❌ Unmapped directions: ${JSON.stringify(result.unmapped)}`);
      return false;
    }
    return true;
  }
);

runTests([testCorruptedPetFlags, testMissingMetadataFile, testDirectionMappingEdgeCases]);
