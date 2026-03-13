import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testNPCEntitySpawns = test(
  {
    given: 'Level with NPC entity defined',
    when: 'Level loads',
    then: 'NPC entity exists in entity manager'
  },
  async (page) => {
    const exists = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const npc = scene.entityManager.getFirst('npc');
      return npc !== undefined && npc !== null;
    });
    return exists === true;
  }
);

const testNPCEntityHasTag = test(
  {
    given: 'NPC entity spawned',
    when: 'Tags are checked',
    then: 'Entity has npc tag'
  },
  async (page) => {
    const hasTag = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const npc = scene.entityManager.getFirst('npc');
      return npc?.tags?.has('npc') ?? false;
    });
    return hasTag === true;
  }
);

runTests({
  level: 'test/test-npc-1-1',
  commands: ['test/interactions/player.js'],
  tests: [testNPCEntitySpawns, testNPCEntityHasTag],
  screenshotPath: 'tmp/test/screenshots/test-npc-1-1.png'
});
