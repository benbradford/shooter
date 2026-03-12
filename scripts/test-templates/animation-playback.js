// Template for testing animation playback
export function animationPlaybackTemplate(config) {
  const { entityType, animationName, featureName } = config;
  
  return `import { test } from '../../../helpers/test-helper.js';
import { runTests } from '../../../helpers/test-runner.js';

const testAnimationPlays = test(
  {
    given: '${entityType} with ${animationName} animation',
    when: '1 second passes',
    then: 'Animation is playing'
  },
  async (page) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isPlaying = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const entity = scene.entityManager.getFirst('${entityType}');
      const anim = entity?.get(window.AnimationComponent);
      return anim && anim.isPlaying;
    });
    return isPlaying === true;
  }
);

runTests({
  level: 'test/test-${featureName}-animation',
  commands: ['test/interactions/player.js'],
  tests: [testAnimationPlays],
  screenshotPath: 'test/screenshots/test-${featureName}-animation.png'
});
`;
}
