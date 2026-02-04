import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const test1 = test(
  {
    given: 'Player at (2, 5) on layer 0',
    when: 'Shoot right toward platform at (4, 5)',
    then: 'Bullet blocked by platform (layer 1 > layer 0) (TEST 1)'
  },
  async (page) => {
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => moveToCellHelper(2, 5, 2000));

    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

const test2 = test(
  {
    given: 'Player at (2, 7) on layer 0',
    when: 'Shoot right toward wall at (4, 7)',
    then: 'Bullet blocked by wall (layer 1 > layer 0) (TEST 2)'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper(2, 7, 2000));

    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

const test3 = test(
  {
    given: 'Player at (3, 7) on layer 0',
    when: 'Shoot right toward wall at (4, 7)',
    then: 'Bullet blocked by wall (layer 1 > layer 0) (TEST 3)'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper(3, 7, 2000));

    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

const test4 = test(
  {
    given: 'Player at (6, 7) on stairs',
    when: 'Shoot right toward stairs at (7, 7)',
    then: 'Bullet passes through stairs (transitions don\'t block) (TEST 4)'
  },
  async (page) => {
    await page.evaluate(() => moveToRowHelper(10, 2000));
    await page.evaluate(() => moveToColHelper(6, 2000));
    await page.evaluate(() => moveToRowHelper(7, 2000));

    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }

    await firePromise;

    return maxBulletCount > 0;
  }
);

const test5 = test(
  {
    given: 'Player at (5, 8) on layer 0',
    when: 'Shoot up through stairs at (5, 7) toward platform at (5, 6)',
    then: 'Bullet upgrades through stairs, passes through platform (TEST 5)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(5, 8, 5000));

    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }

    await firePromise;

    return maxBulletCount > 0;
  }
);

const test6 = test(
  {
    given: 'Player at (9, 7) on platform (layer 1)',
    when: 'Shoot up toward platform at (9, 6)',
    then: 'Bullet passes through platform (layer 1 = layer 1) (TEST 6)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(9, 7, 5000));

    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }

    await firePromise;

    return maxBulletCount > 0;
  }
);

const test7 = test(
  {
    given: 'Player at (9, 7) on platform (layer 1)',
    when: 'Shoot left toward wall at (8, 7)',
    then: 'Bullet passes through wall (layer 1 = layer 1, walls don\'t block at same layer) (TEST 7)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(9, 7, 5000));

    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(-1, 0, 300));
    
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }
    
    await firePromise;

    return maxBulletCount > 0;
  }
);

const test8 = test(
  {
    given: 'Player at (2, 8) on layer 0',
    when: 'Shoot diagonal up-right toward platform at (5, 5)',
    then: 'Bullet blocked by platform (layer 1 > layer 0) (TEST 8)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(2, 8, 5000));

    const firePromise = page.evaluate(() => fireWeapon(0.707, -0.707, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

const test9 = test(
  {
    given: 'Player at (9, 7) on platform (layer 1)',
    when: 'Shoot left through stairs at (5, 7)',
    then: 'Bullet passes through stairs (transitions don\'t block) (TEST 9)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(6, 5, 3000));

    let maxBulletCount = 0;
    const firePromise = page.evaluate(() => fireWeapon(0, 1, 300));

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > maxBulletCount) maxBulletCount = bulletCount;
    }

    await firePromise;

    return maxBulletCount > 0;
  }
);

const test10 = test(
  {
    given: 'Player at (2, 7) on layer 0',
    when: 'Move to (5, 7) stairs, then to (9, 7) platform',
    then: 'Player successfully reaches platform, currentLayer = 1 (TEST 10)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(5, 7, 5000));
    await page.evaluate(() => moveToRowHelper(6, 2000));
    const result = await page.evaluate(() => moveToColHelper(9, 2000));

    const layer = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      return gridPos.currentLayer;
    });

    return result && layer === 1;
  }
);

const test11 = test(
  {
    given: 'Player at (5, 7) on stairs',
    when: 'Shoot right toward wall at (8, 7)',
    then: 'Bullet blocked by wall (upgraded to layer 1, wall blocks at same layer) (TEST 11)'
  },
  async (page) => {
    await page.evaluate(() => moveToCellHelper(5, 7, 2000));

    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

runTests({
  level: 'test/multi-layer-test',
  commands: ['test/interactions/player.js'],
  tests: [
    test1,
    test2,
    test3,
    test4,
    test5,
    test6,
    test7,
    test8,
    test9,
    test10,
    test11
  ],
  screenshotPath: 'tmp/test/screenshots/test-multi-layer.png'
});
