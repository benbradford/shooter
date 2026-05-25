import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testPetNeverEntersBlockedDuringWander = test(
  {
    given: 'Pet wandering near wall and blocked area cells',
    when: 'Pet wanders for 5 seconds',
    then: 'Pet never occupies a wall or blocked area cell'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game && window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 15000 });

    await page.evaluate(async () => {
      const ws = window.WorldStateManager.getInstance();
      ws.setFlag('pet_rock_collected', 'true');
      ws.setFlag('pet_selected', 'rock');
      const petManager = window.PetManager.getInstance();
      await petManager.spawnPet('rock');
    });

    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('pet');
    }, { timeout: 10000 });

    await new Promise(r => setTimeout(r, 500));

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const gameScene = window.game.scene.getScene('game');
        const pet = gameScene.entityManager.getFirst('pet');
        if (!pet) return resolve({ ok: false, reason: 'No pet entity' });

        const grid = gameScene.grid;
        const blockedAreaCells = grid.getBlockedAreaCells();

        let violations = [];
        let checks = 0;
        const maxChecks = 100;

        const interval = setInterval(() => {
          checks++;
          const transform = pet.get(window.TransformComponent);
          const gridPos = pet.get(window.GridPositionComponent);
          if (!transform || !gridPos) {
            if (checks >= maxChecks) { clearInterval(interval); resolve({ ok: violations.length === 0, violations: violations.length, first: violations[0] }); }
            return;
          }

          const col = gridPos.currentCell.col;
          const row = gridPos.currentCell.row;
          const cell = grid.getCell(col, row);

          if (cell && grid.isWall(cell)) {
            violations.push({ col, row, type: 'wall', check: checks });
          } else if (blockedAreaCells && blockedAreaCells.has(`${col},${row}`)) {
            violations.push({ col, row, type: 'blockedArea', check: checks });
          }

          if (checks >= maxChecks) {
            clearInterval(interval);
            resolve({ ok: violations.length === 0, violations: violations.length, first: violations[0] });
          }
        }, 50);
      });
    });

    if (!result.ok) {
      console.log(`❌ Pet entered ${result.first?.type} cell ${result.violations} times. First: col=${result.first?.col} row=${result.first?.row}`);
      return false;
    }
    return true;
  }
);

await runTests({
  level: 'test/test-wall-collision',
  commands: ['test/interactions/player.js'],
  tests: [testPetNeverEntersBlockedDuringWander],
  screenshotPath: 'tmp/test/screenshots/test-pet-wander-blocked.png'
});
