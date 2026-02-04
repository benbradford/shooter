import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

const test1 = test(
  {
    given: 'Player on ground level (layer 0)',
    when: 'Shoots toward layer 1 platform',
    then: 'Bullet blocked by platform'
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
    given: 'Player on ground level (layer 0)',
    when: 'Shoots toward layer 1 wall',
    then: 'Bullet blocked by wall (TEST 2)'
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
    given: 'Player on ground level (layer 0)',
    when: 'Shoots toward layer 1 wall from closer position',
    then: 'Bullet blocked by wall (TEST 3)'
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
    given: 'Player on stairs',
    when: 'Shoots through stairs',
    then: 'Bullet passes through (stairs don\'t block) (TEST 4)'
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
    given: 'Player on ground level (layer 0)',
    when: 'Shoots up through stairs toward platform',
    then: 'Bullet upgrades through stairs and passes through platform (TEST 5)'
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
    given: 'Player on platform (layer 1)',
    when: 'Shoots toward another platform on same layer',
    then: 'Bullet passes through platform (TEST 6)'
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
    given: 'Player on platform (layer 1)',
    when: 'Shoots toward wall on same layer',
    then: 'Bullet passes through wall (TEST 7)'
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
    given: 'Player on ground level (layer 0)',
    when: 'Shoots diagonally toward platform',
    then: 'Bullet blocked by platform (TEST 8)'
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
    given: 'Player on platform (layer 1)',
    when: 'Shoots through stairs',
    then: 'Bullet passes through stairs (TEST 9)'
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
    given: 'Player on ground level (layer 0)',
    when: 'Moves through stairs to platform',
    then: 'Player reaches platform at layer 1 (TEST 10)'
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
    given: 'Player on stairs',
    when: 'Shoots toward wall (bullet upgraded to layer 1)',
    then: 'Bullet blocked by wall at same layer (TEST 11)'
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

const test12 = test(
  {
    given: 'Player on ground level (layer 0)',
    when: 'Shoots up through stairs toward platform edge on layer 1',
    then: 'Bullet cannot pass end of layer 1 platform (TEST 12)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(5, 8, 3000));

    let bulletSpawned = false;
    await page.evaluate(() => fireSingleShot(0, -1));

    await new Promise(resolve => setTimeout(resolve, 100));

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const bulletCount = await page.evaluate(() => getBulletCount());
      if (bulletCount > 0) bulletSpawned = true;
    }

    const finalBulletCount = await page.evaluate(() => getBulletCount());
    return bulletSpawned && finalBulletCount === 0;
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
    test11,
    test12
  ],
  screenshotPath: 'tmp/test/screenshots/test-multi-layer.png'
});
