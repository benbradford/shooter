import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testFindMissingTextures = test(
  {
    given: 'A loaded level',
    when: 'Checking all sprites',
    then: 'Report which sprites use __MISSING texture'
  },
  async (page) => {
    page.on('console', msg => {
      if (msg.text().includes('[TEST]')) {
        console.log('BROWSER:', msg.text());
      }
    });
    
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const children = scene.children.list;
      const missing = [];
      for (const child of children) {
        if (child.texture && child.texture.key === '__MISSING') {
          missing.push({
            type: child.type,
            x: child.x,
            y: child.y,
            depth: child.depth
          });
        }
      }
      console.log('[TEST] Missing textures:', JSON.stringify(missing));
      return missing.length === 0;
    });
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [testFindMissingTextures],
  screenshotPath: 'tmp/test/screenshots/test-missing-textures.png'
});
