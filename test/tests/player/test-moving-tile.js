import { test } from '../../helpers/test-helper.js';
import { runTests } from '../../helpers/test-runner.js';

function teleportPlayer(page, col, row) {
  return page.evaluate(({ col, row }) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const transform = player.require(window.TransformComponent);
    transform.x = col * 64 + 32;
    transform.y = row * 64 + 32;
  }, { col, row });
}

function getPlayerCell(page) {
  return page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const player = scene.entityManager.getFirst('player');
    const gridPos = player.require(window.GridPositionComponent);
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
  });
}

function getMovingTile(page, entityId) {
  return page.evaluate((entityId) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const entity = scene.entityManager.getAll().find(e => e.id === entityId);
    if (!entity) return null;
    const tile = entity.get(window.MovingTileComponent);
    return { col: tile.getTopLeftCol(), row: tile.getTopLeftRow(), isMoving: tile.getIsMoving() };
  }, entityId);
}

// Wait until the given predicate over the moving tile's state is true, or timeout.
function waitForTile(page, entityId, predicateSource, maxMs = 6000) {
  return page.evaluate(({ entityId, predicateSource, maxMs }) => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    const entity = scene.entityManager.getAll().find(e => e.id === entityId);
    const tile = entity.get(window.MovingTileComponent);
    const predicate = eval(predicateSource);
    const start = Date.now();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const state = { col: tile.getTopLeftCol(), row: tile.getTopLeftRow(), isMoving: tile.getIsMoving() };
        if (predicate(state)) {
          clearInterval(interval);
          resolve({ matched: true, ...state });
        } else if (Date.now() - start >= maxMs) {
          clearInterval(interval);
          resolve({ matched: false, ...state });
        }
      }, 30);
    });
  }, { entityId, predicateSource, maxMs });
}

const testTileTexturesArePreloaded = test(
  {
    given: 'A level whose moving tiles use textures nothing else in the level loads',
    when: 'The level finishes loading',
    then: 'Each tile texture is loaded and its sprite is not the missing-texture placeholder'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    const result = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const expected = { moving_tile0: 'ice_platform', moving_tile1: 'grey_platform' };
      return Object.entries(expected).map(([entityId, textureKey]) => {
        const entity = scene.entityManager.getAll().find(e => e.id === entityId);
        const sprite = entity?.get(window.SpriteComponent)?.sprite;
        return {
          entityId,
          textureKey,
          registryLoaded: scene.textures.exists(textureKey),
          spriteTextureKey: sprite?.texture?.key ?? null
        };
      });
    });

    console.log('  Tile textures:', JSON.stringify(result));
    return result.every(r => r.registryLoaded && r.spriteTextureKey === r.textureKey);
  }
);

const testBoardFromWalkableGround = test(
  {
    given: 'A moving tile adjacent to walkable ground',
    when: 'Player walks from the adjacent ground onto the tile',
    then: 'Player boards the tile'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    await teleportPlayer(page, 4, 5);
    await new Promise(r => setTimeout(r, 300));

    const result = await page.evaluate(() => moveToCellHelper(5, 5, 3000));
    return result.reached === true;
  }
);

const testExitBlockedByWall = test(
  {
    given: 'Player standing on the tile with a wall to the north',
    when: 'Player tries to step off toward the wall',
    then: 'Player is blocked and stays on the tile'
  },
  async (page) => {
    await teleportPlayer(page, 5, 5);
    await new Promise(r => setTimeout(r, 300));

    const result = await page.evaluate(() => moveToCellHelper(5, 4, 2000));
    const cell = await getPlayerCell(page);
    return !result.reached && cell.row !== 4;
  }
);

const testExitBlockedByWater = test(
  {
    given: 'Player standing on the tile with water to the east and canSwim false',
    when: 'Player tries to step off toward the water',
    then: 'Player is blocked and stays on the tile'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    await teleportPlayer(page, 5, 5);
    await new Promise(r => setTimeout(r, 300));

    const result = await page.evaluate(() => moveToCellHelper(6, 5, 2000));
    const cell = await getPlayerCell(page);
    return !result.reached && cell.col !== 6;
  }
);

const testExitOntoWalkableGround = test(
  {
    given: 'Player standing on the tile with walkable ground to the south',
    when: 'Player steps off toward the walkable ground',
    then: 'Player leaves the tile onto the ground'
  },
  async (page) => {
    await teleportPlayer(page, 5, 5);
    await new Promise(r => setTimeout(r, 300));

    const result = await page.evaluate(() => moveToCellHelper(5, 6, 3000));
    return result.reached === true;
  }
);

const testRiderCarriedByMovingTile = test(
  {
    given: 'Player standing on a scripted moving tile',
    when: 'The tile moves along its route',
    then: 'The player is carried with the tile'
  },
  async (page) => {
    // The tile loops continuously, so wait until it is parked at its start (col 10).
    const parked = await waitForTile(page, 'moving_tile1', '(s) => s.col === 10 && !s.isMoving', 10000);
    if (!parked.matched) return false;

    // Board the tile while it waits at col 10.
    await teleportPlayer(page, 10, 5);
    await new Promise(r => setTimeout(r, 100));

    const boardedCell = await getPlayerCell(page);
    if (boardedCell.col !== 10) return false;

    // Wait for the tile to travel east toward col 14, carrying the player.
    const arrived = await waitForTile(page, 'moving_tile1', '(s) => s.col >= 13', 6000);
    if (!arrived.matched) return false;

    const cell = await getPlayerCell(page);
    console.log('  Rider carried test: tile arrived col', arrived.col, 'player cell', JSON.stringify(cell));
    return cell.col >= 13;
  }
);

const testRiderCarriedExactlyOnce = test(
  {
    given: 'Player standing still on the center of a 3x3 moving tile (rider box straddles footprint cells)',
    when: 'The tile moves along its route with no player input',
    then: 'The player is carried at the same speed as the tile (no drift), staying at a fixed offset'
  },
  async (page) => {
    // Park the 3x3 tile at its start (col 2), board its center cell (3,9), then
    // sample the player-to-tile offset while it moves. A doubled carry would grow it.
    const parked = await waitForTile(page, 'moving_tile2', '(s) => s.col === 2 && !s.isMoving', 12000);
    if (!parked.matched) return false;

    await teleportPlayer(page, 3, 9);
    await new Promise(r => setTimeout(r, 100));

    const result = await page.evaluate(() => new Promise((resolve) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const tileEntity = scene.entityManager.getAll().find(e => e.id === 'moving_tile2');
      const tile = tileEntity.get(window.MovingTileComponent);
      const tileTransform = tileEntity.require(window.TransformComponent);
      const player = scene.entityManager.getFirst('player');
      const playerTransform = player.require(window.TransformComponent);

      const offsets = [];
      const start = Date.now();
      const interval = setInterval(() => {
        if (tile.getIsMoving()) {
          offsets.push(+(playerTransform.x - tileTransform.x).toFixed(2));
        }
        if (Date.now() - start >= 1500) {
          clearInterval(interval);
          resolve(offsets);
        }
      }, 40);
    }));

    console.log('  Rider offsets while moving:', JSON.stringify(result));
    if (result.length < 3) return false;
    // A doubled carry grows the offset every frame; a correct carry holds it constant.
    return result.every(offset => Math.abs(offset - result[0]) < 1);
  }
);

const testRiderMovesIndependentlyWhileCarried = test(
  {
    given: 'Player standing on the center of a 3x3 moving tile',
    when: 'The tile moves along one axis and the player walks along the perpendicular axis',
    then: 'The player is carried along the tile axis while also moving under their own input'
  },
  async (page) => {
    const parked = await waitForTile(page, 'moving_tile2', '(s) => s.col === 2 && !s.isMoving', 12000);
    if (!parked.matched) return false;

    // Board the south row so a little northward walk stays within the footprint.
    await teleportPlayer(page, 3, 10);
    await new Promise(r => setTimeout(r, 100));

    const result = await page.evaluate(() => new Promise((resolve) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const tileEntity = scene.entityManager.getAll().find(e => e.id === 'moving_tile2');
      const tileTransform = tileEntity.require(window.TransformComponent);
      const player = scene.entityManager.getFirst('player');
      const playerTransform = player.require(window.TransformComponent);
      let remoteInput = player.get(window.RemoteInputComponent);
      if (!remoteInput) remoteInput = player.add(new window.RemoteInputComponent());

      const startY = playerTransform.y;
      const startOffsetX = playerTransform.x - tileTransform.x;
      remoteInput.setWalk(0, -1, true);

      const start = Date.now();
      const interval = setInterval(() => {
        if (Date.now() - start >= 600) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          resolve({
            carriedX: Math.abs((playerTransform.x - tileTransform.x) - startOffsetX) < 4,
            walkedNorth: playerTransform.y < startY - 10
          });
        }
      }, 40);
    }));

    console.log('  Independent-while-carried:', JSON.stringify(result));
    return result.carriedX && result.walkedNorth;
  }
);

const testRiderCarriedOverWater = test(
  {
    given: 'Player on a moving tile that crosses water cells (canSwim false)',
    when: 'The tile moves from land through water to land',
    then: 'The player stays on the tile and does not fall into the water'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    // Wait for tile1 to park at its start (col 10) — land cell before water at 11,12,13
    const parked = await waitForTile(page, 'moving_tile1', '(s) => s.col === 10 && !s.isMoving', 10000);
    if (!parked.matched) { console.log('  FAIL: tile did not park at col 10'); return false; }

    // Walk onto the tile from an adjacent land cell (col 9) to simulate real gameplay
    await teleportPlayer(page, 9, 5);
    await new Promise(r => setTimeout(r, 200));

    // Walk east onto the tile at col 10
    const walkResult = await page.evaluate(() => moveToCellHelper(10, 5, 3000));
    console.log('  Walk to tile result:', JSON.stringify(walkResult));
    if (!walkResult.reached) { console.log('  FAIL: could not walk onto tile'); return false; }

    // Now wait for the tile to carry us across water to col 14
    // Instrument frame-by-frame to diagnose
    const diagnosis = await page.evaluate(() => new Promise((resolve) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const tileEntity = scene.entityManager.getAll().find(e => e.id === 'moving_tile1');
      const tile = tileEntity.get(window.MovingTileComponent);
      const tileTransform = tileEntity.require(window.TransformComponent);
      const player = scene.entityManager.getFirst('player');
      const playerTransform = player.require(window.TransformComponent);
      const gridPos = player.require(window.GridPositionComponent);
      const waterEffect = player.get(window.WaterEffectComponent);
      const walk = player.get(window.WalkComponent);

      const events = [];
      let frameCount = 0;
      let detachedAt = -1;
      let everInWater = false;
      const start = Date.now();

      const interval = setInterval(() => {
        frameCount++;
        const tileCol = tile.getTopLeftCol();
        const playerCol = gridPos.currentCell.col;
        const tilePx = +tileTransform.x.toFixed(1);
        const playerPx = +playerTransform.x.toFixed(1);
        const offset = +(playerPx - tilePx).toFixed(1);
        const isInWater = waterEffect ? waterEffect.getIsInWater() : false;
        const isMoving = walk ? walk.isMoving() : false;

        if (isInWater) everInWater = true;

        if (offset !== 0 && detachedAt < 0) {
          detachedAt = frameCount;
          events.push({ event: 'DETACHED', frame: frameCount, tileCol, playerCol, tilePx, playerPx, offset, isInWater, isMoving, ms: Date.now() - start });
        }

        // Log every 3rd frame while tile is moving, up to 30 events
        if (events.length < 30 && tile.getIsMoving() && frameCount % 3 === 0) {
          events.push({ frame: frameCount, tileCol, playerCol, tilePx, playerPx, offset, isInWater, isMoving });
        }

        if (Date.now() - start >= 5000 || tileCol >= 14) {
          clearInterval(interval);
          resolve({ events, finalPlayerCol: playerCol, finalTileCol: tileCol, everInWater });
        }
      }, 16);
    }));

    console.log('  Diagnosis:');
    for (const e of diagnosis.events) {
      console.log('   ', JSON.stringify(e));
    }
    console.log('  Final: player col', diagnosis.finalPlayerCol, 'tile col', diagnosis.finalTileCol, 'everInWater', diagnosis.everInWater);

    if (diagnosis.finalPlayerCol < 13) {
      console.log('  FAIL: player fell off tile (col ' + diagnosis.finalPlayerCol + ' instead of near 14)');
      return false;
    }
    // A carried rider must stay dry the whole way — swimming over the tile's
    // water cells is the reported bug.
    if (diagnosis.everInWater) {
      console.log('  FAIL: player entered water while being carried across it');
      return false;
    }
    return true;
  }
);

const testWalkOffMovingTileIntoWaterBlocked = test(
  {
    given: 'Player on a vertical tile moving south over water, walking south (same direction)',
    when: 'Player keeps walking south while tile moves south over water',
    then: 'Player stays on the tile and does not fall into water'
  },
  async (page) => {
    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    // Wait for the vertical tile to park at row 2
    const parked = await waitForTile(page, 'moving_tile_vertical', '(s) => s.row === 2 && !s.isMoving', 12000);
    if (!parked.matched) { console.log('  FAIL: vertical tile did not park at row 2'); return false; }

    // Walk onto the tile from the north (row 1)
    await teleportPlayer(page, 17, 1);
    await new Promise(r => setTimeout(r, 100));
    const walked = await page.evaluate(() => moveToCellHelper(17, 2, 3000));
    if (!walked.reached) { console.log('  FAIL: could not walk onto tile'); return false; }

    // Now hold south — walk in the same direction the tile is moving.
    // The tile moves south through water at rows 3-8.
    const result = await page.evaluate(() => new Promise(resolve => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const playerTransform = player.require(window.TransformComponent);
      const tileEntity = scene.entityManager.getAll().find(e => e.id === 'moving_tile_vertical');
      const tile = tileEntity.get(window.MovingTileComponent);
      const tileTransform = tileEntity.require(window.TransformComponent);
      const waterEffect = player.get(window.WaterEffectComponent);
      const remoteInput = enableRemoteInput();

      // Hold south
      remoteInput.setWalk(0, 1, true);

      let everInWater = false;
      const start = Date.now();
      const interval = setInterval(() => {
        if (waterEffect && waterEffect.getIsInWater()) everInWater = true;

        // Stop after 2.5 seconds or when tile reaches row 7+
        if (Date.now() - start >= 2500 || tile.getTopLeftRow() >= 7) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          const offsetY = +(playerTransform.y - tileTransform.y).toFixed(1);
          resolve({
            everInWater,
            tileRow: tile.getTopLeftRow(),
            playerY: +playerTransform.y.toFixed(1),
            tileY: +tileTransform.y.toFixed(1),
            offsetY
          });
        }
      }, 16);
    }));

    console.log('  Result:', JSON.stringify(result));
    if (result.everInWater) {
      console.log('  FAIL: player fell into water while walking south on southbound tile');
      return false;
    }
    return true;
  }
);

const testScriptLoopsForever = test(
  {
    given: 'A scripted moving tile that returns to its start',
    when: 'A full script cycle completes',
    then: 'The tile returns to its start cell and begins moving out again (looping)'
  },
  async (page) => {
    // From the previous test the tile is near col 14. Wait for it to return to col 10.
    const returned = await waitForTile(page, 'moving_tile1', '(s) => s.col <= 10', 8000);
    if (!returned.matched) return false;

    // After the loop restarts (wait then move east again), it should leave col 10 once more.
    const movedAgain = await waitForTile(page, 'moving_tile1', '(s) => s.col >= 12', 8000);
    return movedAgain.matched === true;
  }
);

const testPlayerCanMoveAfterExitingMovingTileOverWater = test(
  {
    given: 'Player riding a moving tile over water, hops off onto dry land and immediately stops',
    when: 'Player then tries to move again',
    then: 'Player can move freely (is not stuck)'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    await page.evaluate(() => setFlag('canSwim', 'false'));
    await page.evaluate(() => waitForFlagSync());

    // Wait for tile1 to park at col 10 (it moves east over water at cols 11-13 to col 14)
    const parked = await waitForTile(page, 'moving_tile1', '(s) => s.col === 10 && !s.isMoving', 10000);
    if (!parked.matched) { console.log('  FAIL: tile did not park'); return false; }

    // Board the tile
    await teleportPlayer(page, 10, 5);
    await new Promise(r => setTimeout(r, 200));

    // Wait for tile to reach col 14 (dry land on east side)
    const arrived = await waitForTile(page, 'moving_tile1', '(s) => s.col >= 14', 8000);
    if (!arrived.matched) { console.log('  FAIL: tile did not reach col 14'); return false; }

    // Now walk east off the tile onto dry land and immediately stop
    const exitResult = await page.evaluate(() => new Promise(resolve => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      const remoteInput = enableRemoteInput();

      // Walk east
      remoteInput.setWalk(1, 0, true);

      const start = Date.now();
      const startCol = gridPos.currentCell.col;
      const interval = setInterval(() => {
        // Once we've moved to a new cell east of the tile, stop immediately
        if (gridPos.currentCell.col > startCol) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          resolve({ exitedToCol: gridPos.currentCell.col });
        } else if (Date.now() - start >= 3000) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          resolve({ exitedToCol: -1 });
        }
      }, 16);
    }));

    console.log('  Exit result:', JSON.stringify(exitResult));
    if (exitResult.exitedToCol < 0) { console.log('  FAIL: could not exit tile'); return false; }

    // Wait 500ms standing still
    await new Promise(r => setTimeout(r, 500));

    // Check state
    const stateCheck = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      const collision = player.get(window.GridCollisionComponent);
      return {
        cell: { col: gridPos.currentCell.col, row: gridPos.currentCell.row },
        onMovingTile: collision?.onMovingTile ?? false,
        onMovingTileThisFrame: collision?.onMovingTileThisFrame ?? false,
        enabled: collision?.enabled ?? false
      };
    });
    console.log('  State after exit+stop:', JSON.stringify(stateCheck));

    // Now try to move south
    const targetCol = exitResult.exitedToCol;
    const moveResult = await page.evaluate((col) => moveToCellHelper(col, 6, 3000), targetCol);
    console.log('  Move after exit result:', JSON.stringify(moveResult));
    if (!moveResult.reached) {
      console.log('  FAIL: player stuck after exiting moving tile over water');
      return false;
    }

    return true;
  }
);

const testPlayerCanMoveAfterExitingTile = test(
  {
    given: 'Player on a stationary tile, walks off onto land and stops',
    when: 'Player then tries to move again',
    then: 'Player can move freely (is not stuck)'
  },
  async (page) => {
    await page.waitForFunction(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      return scene && scene.entityManager && scene.entityManager.getFirst('player');
    }, { timeout: 10000 });

    // Start on the tile at (5,5)
    await teleportPlayer(page, 5, 5);
    await new Promise(r => setTimeout(r, 200));

    // Walk south off the tile onto safe ground at (5,6)
    const exitResult = await page.evaluate(() => moveToCellHelper(5, 6, 3000));
    if (!exitResult.reached) {
      console.log('  FAIL: could not exit tile southward');
      return false;
    }

    // Stop all input and wait a moment
    await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      let remoteInput = player.get(window.RemoteInputComponent);
      if (remoteInput) remoteInput.setWalk(0, 0, false);
    });
    await new Promise(r => setTimeout(r, 500));

    // Check the player is not stuck: verify onMovingTile is cleared
    const stateCheck = await page.evaluate(() => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      const collision = player.get(window.GridCollisionComponent);
      return {
        cell: { col: gridPos.currentCell.col, row: gridPos.currentCell.row },
        onMovingTile: collision?.onMovingTile ?? false,
        enabled: collision?.enabled ?? false
      };
    });
    console.log('  After exit+stop:', JSON.stringify(stateCheck));
    if (stateCheck.onMovingTile) {
      console.log('  FAIL: onMovingTile still true after exiting tile and stopping');
      return false;
    }

    // Now try to move south again using direct input
    const moveResult = await page.evaluate(() => new Promise(resolve => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      const player = scene.entityManager.getFirst('player');
      const gridPos = player.require(window.GridPositionComponent);
      const transform = player.require(window.TransformComponent);
      const startY = transform.y;
      const remoteInput = enableRemoteInput();
      remoteInput.setWalk(0, 1, true);
      const start = Date.now();
      const interval = setInterval(() => {
        if (transform.y > startY + 20) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          resolve({ moved: true, row: gridPos.currentCell.row });
        } else if (Date.now() - start >= 2000) {
          clearInterval(interval);
          remoteInput.setWalk(0, 0, false);
          resolve({ moved: false, row: gridPos.currentCell.row, y: transform.y, startY });
        }
      }, 16);
    }));
    console.log('  Move after exit result:', JSON.stringify(moveResult));
    if (!moveResult.moved) {
      console.log('  FAIL: player stuck after exiting tile');
      return false;
    }

    return true;
  }
);

runTests({
  level: 'test/test-moving-tile',
  commands: [
    'test/interactions/player.js',
    'test/interactions/flags.js',
    'test/interactions/state.js'
  ],
  tests: [
    testTileTexturesArePreloaded,
    testBoardFromWalkableGround,
    testExitBlockedByWall,
    testExitBlockedByWater,
    testExitOntoWalkableGround,
    testRiderCarriedByMovingTile,
    testRiderCarriedOverWater,
    testWalkOffMovingTileIntoWaterBlocked,
    testRiderCarriedExactlyOnce,
    testRiderMovesIndependentlyWhileCarried,
    testScriptLoopsForever,
    testPlayerCanMoveAfterExitingMovingTileOverWater,
    testPlayerCanMoveAfterExitingTile
  ],
  screenshotPath: 'tmp/test/screenshots/test-moving-tile.png'
});
