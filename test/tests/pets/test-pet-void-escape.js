import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

async function waitForGameReady(page) {
  await page.waitForFunction(() => {
    const scene = window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('player');
  }, { timeout: 15000 });
  await page.waitForFunction(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene && scene.entityManager && scene.entityManager.getFirst('pet');
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));
}

const testPetEscapesVoidCell = test(
  {
    given: 'Pet is forcibly placed on a void cell, player is on solid ground',
    when: '500ms passes',
    then: 'Pet teleports off the void cell to the player'
  },
  async (page) => {
    await waitForGameReady(page);

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const scene = window.game.scene.getScene('game');
        const player = scene.entityManager.getFirst('player');
        const pet = scene.entityManager.getFirst('pet');
        const playerT = player.require(window.TransformComponent);
        const petT = pet.require(window.TransformComponent);
        const cellSize = scene.grid.cellSize;

        // Player stays at start (3,5) — solid ground
        // Put pet on void cell (4,5)
        petT.x = 4 * cellSize + cellSize / 2;
        petT.y = 5 * cellSize + cellSize / 2;

        const petStartX = petT.x;
        const petStartY = petT.y;

        setTimeout(() => {
          const petFinalX = petT.x;
          const petFinalY = petT.y;
          const playerFinalX = playerT.x;
          const playerFinalY = playerT.y;

          const petCell = scene.grid.worldToCell(petFinalX, petFinalY);
          const petCellData = scene.grid.getCell(petCell.col, petCell.row);
          const petStillOnVoid = petCellData ? petCellData.properties.has('void') : false;

          const petDistFromPlayer = Math.hypot(petFinalX - playerFinalX, petFinalY - playerFinalY);
          const petMovedFromStart = Math.hypot(petFinalX - petStartX, petFinalY - petStartY);

          resolve({
            petStartX,
            petStartY,
            petFinalX,
            petFinalY,
            playerFinalX,
            playerFinalY,
            petStillOnVoid,
            petDistFromPlayer,
            petMovedFromStart,
            petCell: { col: petCell.col, row: petCell.row },
          });
        }, 500);
      });
    });

    console.log(`Pet start (on void): (${result.petStartX.toFixed(0)}, ${result.petStartY.toFixed(0)})`);
    console.log(`Pet final: (${result.petFinalX.toFixed(0)}, ${result.petFinalY.toFixed(0)}) cell=(${result.petCell.col},${result.petCell.row})`);
    console.log(`Player: (${result.playerFinalX.toFixed(0)}, ${result.playerFinalY.toFixed(0)})`);
    console.log(`Pet still on void: ${result.petStillOnVoid}`);
    console.log(`Pet moved from start: ${result.petMovedFromStart.toFixed(0)}px`);
    console.log(`Pet-player distance: ${result.petDistFromPlayer.toFixed(0)}px`);

    if (result.petStillOnVoid) {
      console.log(`❌ Pet is still stuck on void after 500ms`);
      return false;
    }

    if (result.petMovedFromStart < 10) {
      console.log(`❌ Pet didn't move at all`);
      return false;
    }

    console.log(`✓ Pet escaped void cell`);
    return true;
  }
);

await runTests({
  level: 'test/test-jump',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js'
  ],
  tests: [testPetEscapesVoidCell],
  screenshotPath: 'tmp/test/screenshots/test-pet-void-escape.png'
});
