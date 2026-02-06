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
    await page.evaluate(() => moveToPathfindHelper(2, 5, 2000));

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
    when: 'Shoots horizontally toward layer 1 wall',
    then: 'Bullet passes through (hits bottom half of wall cell) (TEST 2)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(2, 7, 2000));

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

const test3 = test(
  {
    given: 'Player on ground level (layer 0)',
    when: 'Shoots horizontally toward layer 1 wall from closer position',
    then: 'Bullet passes through (gun tip in bottom 40% of wall cell) (TEST 3)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(3, 7, 2000));

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

const test3_5 = test(
  {
    given: 'Player on ground level (layer 0) below wall',
    when: 'Shoots upward toward layer 1 wall',
    then: 'Bullet blocked by wall (hits top 50% where wall is) (TEST 3.5)'
  },
  async (page) => {
    await page.evaluate(() => moveToPathfindHelper(4, 8, 2000));

    const firePromise = page.evaluate(() => fireWeapon(0, -1, 300));
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
    given: 'Player on platform (layer 1) at top of stairs',
    when: 'Shoots down from columns 5-7',
    then: 'All bullets reach ground (TEST 9)'
  },
  async (page) => {
    await page.evaluate(() => waitForFullAmmo());
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => moveToPathfindHelper(5, 5, 5000));
    
    const results = await page.evaluate(async () => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      const grid = scene.grid;
      const cellSize = grid.cellSize;
      
      const startCol = 5;
      const endCol = 7;
      const shootRow = 6;
      const stairsRow = 7;
      const groundRow = 8;
      
      const results = [];
      
      await moveToPathfindHelper(startCol, shootRow, 3000);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (let col = startCol; col <= endCol; col++) {
        await moveToPathfindHelper(col, shootRow, 3000);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        fireSingleShot(0, 1);
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        let passedStairs = false;
        let reachedGround = false;
        const cells = [];
        
        for (let check = 0; check < 50; check++) {
          const bullets = scene.entityManager.getByType('bullet');
          if (bullets.length > 0) {
            const bullet = bullets[0];
            const bulletTransform = bullet.require(window.TransformComponent);
            const bulletCell = grid.worldToCell(bulletTransform.x, bulletTransform.y);
            const cellKey = `${bulletCell.col},${bulletCell.row}`;
            if (!cells.includes(cellKey)) cells.push(cellKey);
            
            if (bulletCell.row === stairsRow) passedStairs = true;
            if (bulletCell.row >= groundRow) reachedGround = true;
          } else if (cells.length > 0) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        results.push({
          position: col,
          x: Math.round(transform.x),
          passedStairs,
          reachedGround,
          cells
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
    });
    
    if (process.env.VERBOSE) {
      console.log('[TEST 9] Results:');
      results.forEach(r => {
        console.log(`  Column ${r.position} (x=${r.x}): stairs=${r.passedStairs}, ground=${r.reachedGround}, cells=${r.cells.join(' ')}`);
      });
    }
    
    const allPassed = results.every(r => r.reachedGround);
    const failedCount = results.filter(r => !r.reachedGround).length;
    
    if (!allPassed) {
      const failed = results.filter(r => !r.reachedGround);
      console.log(`[TEST 9] Failed ${failedCount}/${results.length}: ${failed.map(r => `x=${r.x}`).join(', ')}`);
    }
    
    return allPassed;
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
    await page.evaluate(() => moveToPathfindHelper(5, 7, 2000));

    const firePromise = page.evaluate(() => fireWeapon(1, 0, 300));
    await new Promise(resolve => setTimeout(resolve, 100));
    const bulletCount = await page.evaluate(() => getBulletCount());
    await firePromise;

    return bulletCount === 0;
  }
);

const test12 = test(
  {
    given: 'Player below stairs at row 8',
    when: 'Shoots up at multiple positions across stairs (10px intervals)',
    then: 'All bullets reach platform and stop at edge (TEST 12)'
  },
  async (page) => {
    await page.evaluate(() => waitForFullAmmo());
    await page.evaluate(() => enableRemoteInput());
    await page.evaluate(() => moveToPathfindHelper(5, 8, 3000));
    
    const results = await page.evaluate(async () => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      const grid = scene.grid;
      const cellSize = grid.cellSize;
      
      const startCol = 5;
      const endCol = 7;
      const shootRow = 8;
      const stairsRow = 7;
      const stepPx = 10;
      
      const startX = startCol * cellSize + cellSize / 2;
      const endX = endCol * cellSize + cellSize / 2;
      const totalDistance = endX - startX;
      const testCount = Math.floor(totalDistance / stepPx) + 1;
      const results = [];
      
      const startY = shootRow * cellSize + cellSize / 2;
      movePlayer(startX - transform.x, startY - transform.y);
      
      for (let i = 0; i < testCount; i++) {
        const targetX = Math.min(startX + (i * stepPx), endX);
        const targetY = shootRow * cellSize + cellSize / 2;
        
        movePlayer(targetX - transform.x, targetY - transform.y);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        fireSingleShot(0, -1);
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        let passedStairs = false;
        let reachedPlatform = false;
        let stoppedAtEdge = true;
        const cells = [];
        
        for (let check = 0; check < 50; check++) {
          const bullets = scene.entityManager.getByType('bullet');
          if (bullets.length > 0) {
            const bullet = bullets[0];
            const bulletTransform = bullet.require(window.TransformComponent);
            const bulletCell = grid.worldToCell(bulletTransform.x, bulletTransform.y);
            const cellKey = `${bulletCell.col},${bulletCell.row}`;
            if (!cells.includes(cellKey)) cells.push(cellKey);
            
            if (bulletCell.row === stairsRow) passedStairs = true;
            if (bulletCell.row <= 6) reachedPlatform = true;
            if (bulletCell.row < 5) stoppedAtEdge = false;
          } else if (cells.length > 0) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        results.push({
          position: i + 1,
          x: Math.round(targetX),
          passedStairs,
          reachedPlatform,
          stoppedAtEdge,
          cells
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return results;
    });
    
    if (process.env.VERBOSE) {
      console.log('[TEST 12] Results:');
      results.forEach(r => {
        console.log(`  Position ${r.position} (x=${r.x}): stairs=${r.passedStairs}, platform=${r.reachedPlatform}, stoppedAtEdge=${r.stoppedAtEdge}, cells=${r.cells.join(' ')}`);
      });
    }
    
    const allPassed = results.every(r => r.reachedPlatform && r.stoppedAtEdge);
    const failedCount = results.filter(r => !r.reachedPlatform || !r.stoppedAtEdge).length;
    
    if (!allPassed) {
      const failed = results.filter(r => !r.reachedPlatform || !r.stoppedAtEdge);
      console.log(`[TEST 12] Failed ${failedCount}/${results.length}: ${failed.map(r => `x=${r.x} (platform=${r.reachedPlatform}, edge=${r.stoppedAtEdge})`).join(', ')}`);
    }
    
    return allPassed;
  }
);

const test13 = test(
  {
    given: 'Player one cell below stairs at row 9',
    when: 'Shoots up at multiple positions across stairs (10px intervals)',
    then: 'All bullets reach platform and stop at edge (TEST 13)'
  },
  async (page) => {
    return await page.evaluate(async () => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const transform = player.require(window.TransformComponent);
      const grid = scene.grid;
      const cellSize = grid.cellSize;
      
      const startCol = 5;
      const endCol = 7;
      const shootRow = 9;
      const stairsRow = 7;
      const platformRow = 6;
      
      const startX = startCol * cellSize + cellSize / 2;
      const endX = endCol * cellSize + cellSize / 2;
      const stepPx = 10;
      const totalDistance = endX - startX;
      const testCount = Math.floor(totalDistance / stepPx) + 1;
      const results = [];
      
      const startY = shootRow * cellSize + cellSize / 2;
      movePlayer(startX - transform.x, startY - transform.y);
      
      for (let i = 0; i < testCount; i++) {
        const targetX = Math.min(startX + (i * stepPx), endX);
        const targetY = shootRow * cellSize + cellSize / 2;
        
        movePlayer(targetX - transform.x, targetY - transform.y);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        fireSingleShot(0, -1);
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        let passedStairs = false;
        let reachedPlatform = false;
        let stoppedAtEdge = true;
        const cells = [];
        
        for (let check = 0; check < 50; check++) {
          const bullets = scene.entityManager.getByType('bullet');
          if (bullets.length > 0) {
            const bullet = bullets[0];
            const bulletTransform = bullet.require(window.TransformComponent);
            const bulletCell = grid.worldToCell(bulletTransform.x, bulletTransform.y);
            const cellKey = `${bulletCell.col},${bulletCell.row}`;
            if (!cells.includes(cellKey)) cells.push(cellKey);
            
            if (bulletCell.row === stairsRow) passedStairs = true;
            if (bulletCell.row <= platformRow) reachedPlatform = true;
            if (bulletCell.row < 5) stoppedAtEdge = false;
          } else if (cells.length > 0) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        results.push({
          position: i + 1,
          x: Math.round(targetX),
          passedStairs,
          reachedPlatform,
          stoppedAtEdge,
          cells
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const allPassed = results.every(r => r.reachedPlatform && r.stoppedAtEdge);
      const failedCount = results.filter(r => !r.reachedPlatform || !r.stoppedAtEdge).length;
      
      console.log(`[TEST 13] Results: ${results.length} positions tested`);
      for (const r of results) {
        console.log(`  Column ${r.position} (x=${r.x}): platform=${r.reachedPlatform}, stoppedAtEdge=${r.stoppedAtEdge}, cells=${r.cells.join(' ')}`);
      }
      
      if (!allPassed) {
        const failed = results.filter(r => !r.reachedPlatform || !r.stoppedAtEdge);
        console.log(`[TEST 13] Failed ${failedCount}/${results.length}: ${failed.map(r => `x=${r.x} (platform=${r.reachedPlatform}, edge=${r.stoppedAtEdge})`).join(', ')}`);
      }
      
      return allPassed;
    });
  }
);

runTests({
  level: 'test/multi-layer-test',
  commands: ['test/interactions/player.js'],
  tests: [
    test1,
    test2,
    test3,
    test3_5,
    test4,
    test5,
    test6,
    test7,
    test8,
    test9,
    test10,
    test11,
    test12,
    test13
  ],
  screenshotPath: 'tmp/test/screenshots/test-multi-layer.png'
});
