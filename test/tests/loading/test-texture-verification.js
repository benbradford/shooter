import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const testTextureVerifierExistsOnWindow = test(
  {
    given: 'The game is loaded',
    when: 'Checking loaded textures',
    then: 'All non-internal textures have valid dimensions'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const keys = scene.textures.getTextureKeys()
        .filter(k => k !== '__DEFAULT' && k !== '__MISSING');

      for (const key of keys) {
        const texture = scene.textures.get(key);
        if (!texture) return false;
        const frame = texture.get('__BASE') || texture.get(0);
        if (!frame || !frame.source) continue;
        if (frame.source.width === 0 || frame.source.height === 0) {
          console.log(`[TEST] Texture '${key}' has zero dimensions`);
          return false;
        }
      }
      return true;
    });
    return result;
  }
);

const testMissingTextureDetection = test(
  {
    given: 'A non-existent texture key',
    when: 'Checking if texture exists',
    then: 'textures.exists returns false'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return !scene.textures.exists('nonexistent_texture_key_12345');
    });
    return result;
  }
);

const testLoadedTexturesAreValid = test(
  {
    given: 'Core textures are loaded',
    when: 'Verifying attacker texture',
    then: 'Texture has frames and valid source'
  },
  async (page) => {
    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      if (!scene.textures.exists('attacker')) return false;
      const texture = scene.textures.get('attacker');
      if (!texture) return false;
      const frameNames = texture.getFrameNames();
      if (frameNames.length === 0) return false;
      const firstFrame = texture.get(frameNames[0] || '__BASE');
      if (!firstFrame || !firstFrame.source) return false;
      return firstFrame.source.width > 0 && firstFrame.source.height > 0;
    });
    return result;
  }
);

runTests({
  level: 'test/test-loading-simple',
  commands: ['test/interactions/player.js'],
  tests: [
    testTextureVerifierExistsOnWindow,
    testMissingTextureDetection,
    testLoadedTexturesAreValid
  ],
  screenshotPath: 'tmp/test/screenshots/test-texture-verification.png'
});
