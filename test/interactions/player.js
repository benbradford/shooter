function testLog(...args) {
  if (window.VERBOSE) {
    console.log(...args);
  }
}

function getPlayerPosition() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  return { x: transform.x, y: transform.y };
}

function enableRemoteInput() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  
  let remoteInput = player.get(window.RemoteInputComponent);
  if (!remoteInput) {
    remoteInput = player.add(new window.RemoteInputComponent());
    testLog('[DEBUG] Remote input enabled');
  }
  return remoteInput;
}

function setPlayerInput(dx, dy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setWalk(dx, dy, true);
  testLog(`[DEBUG] Player walk input set to (${dx}, ${dy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setWalk(0, 0, false);
      testLog('[DEBUG] Player walk input cleared');
      setTimeout(resolve, 100);
    }, durationMs);
  });
}

function fireWeapon(aimDx, aimDy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setAim(aimDx, aimDy, true);
  testLog(`[DEBUG] Firing weapon in direction (${aimDx}, ${aimDy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      testLog('[DEBUG] Stopped firing');
      setTimeout(resolve, 100);
    }, durationMs);
  });
}

function fireSingleShot(aimDx, aimDy) {
  const remoteInput = enableRemoteInput();
  const waitTime = window.INITIAL_AIM_WAIT_TIME_MS + 50;
  
  remoteInput.setAim(aimDx, aimDy, true);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      resolve();
    }, waitTime);
  });
}

function getBulletCount() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const bullets = scene.entityManager.getByType('bullet');
  return bullets.length;
}

function moveToPathfindHelper(targetCol, targetRow, maxTimeMs = 10000) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const gridPos = player.require(window.GridPositionComponent);
  const transform = player.require(window.TransformComponent);
  const grid = scene.grid;
  
  const startCol = gridPos.currentCell.col;
  const startRow = gridPos.currentCell.row;
  const startLayer = gridPos.currentLayer;
  
  testLog(`[TEST] Pathfinding from (${startCol},${startRow}) layer ${startLayer} to (${targetCol},${targetRow})`);
  
  const pathfinder = new window.Pathfinder(grid);
  const path = pathfinder.findPath(startCol, startRow, targetCol, targetRow, startLayer, false, true);
  
  if (!path || path.length === 0) {
    testLog(`[TEST] No path found`);
    return Promise.resolve({ reached: false, col: startCol, row: startRow });
  }
  
  testLog(`[TEST] Path: ${path.map(n => `(${n.col},${n.row})`).join(' -> ')}`);
  
  let pathIndex = 1;
  const startTime = Date.now();
  const cellSize = grid.cellSize;
  const threshold = 15;
  let lastDistance = Infinity;
  let stuckCount = 0;
  
  return new Promise((resolve) => {
    const remoteInput = enableRemoteInput();
    
    const interval = setInterval(() => {
      if (Date.now() - startTime >= maxTimeMs) {
        remoteInput.setWalk(0, 0, false);
        clearInterval(interval);
        const finalCell = grid.worldToCell(transform.x, transform.y);
        testLog(`[TEST] Timeout at (${finalCell.col},${finalCell.row})`);
        resolve({ reached: false, col: finalCell.col, row: finalCell.row });
        return;
      }
      
      if (pathIndex >= path.length) {
        remoteInput.setWalk(0, 0, false);
        clearInterval(interval);
        testLog(`[TEST] Reached destination (${targetCol},${targetRow})`);
        resolve({ reached: true, col: targetCol, row: targetRow });
        return;
      }
      
      const targetNode = path[pathIndex];
      const targetWorld = grid.cellToWorld(targetNode.col, targetNode.row);
      const targetX = targetWorld.x + cellSize / 2;
      const targetY = targetWorld.y + cellSize / 2;
      
      const dx = targetX - transform.x;
      const dy = targetY - transform.y;
      const distance = Math.hypot(dx, dy);
      
      if (Math.abs(distance - lastDistance) < 1) {
        stuckCount++;
        if (stuckCount > 60) {
          remoteInput.setWalk(0, 0, false);
          clearInterval(interval);
          const finalCell = grid.worldToCell(transform.x, transform.y);
          testLog(`[TEST] Stuck at (${finalCell.col},${finalCell.row})`);
          resolve({ reached: false, col: finalCell.col, row: finalCell.row });
          return;
        }
      } else {
        stuckCount = 0;
        lastDistance = distance;
      }
      
      if (distance < threshold) {
        testLog(`[TEST] Reached waypoint ${pathIndex}: (${targetNode.col},${targetNode.row})`);
        pathIndex++;
      } else {
        const dirX = dx / distance;
        const dirY = dy / distance;
        remoteInput.setWalk(dirX, dirY, true);
      }
    }, 16);
  });
}

function movePlayer(dx, dy) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  transform.x += dx;
  transform.y += dy;
  testLog(`[TEST] Player moved to (${transform.x}, ${transform.y})`);
}

function moveToRowHelper(targetRow, maxTimeMs = 5000) {
  const cellSize = 64;
  const targetY = targetRow * cellSize + cellSize / 2 - 10;
  const threshold = 5;
  const startTime = Date.now();
  
  const startPos = getPlayerPosition();
  const dy = targetY - startPos.y;
  const dirY = dy > 0 ? 1 : -1;
  
  let checkCount = 0;
  let lastY = startPos.y;
  let stuckCount = 0;
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (Date.now() - startTime >= maxTimeMs) {
        setPlayerInput(0, 0, 0);
        clearInterval(interval);
        resolve(false);
        return;
      }
      
      const currentPos = getPlayerPosition();
      checkCount++;
      
      if (Math.abs(currentPos.y - lastY) < 1) {
        stuckCount++;
        if (stuckCount > 40) {
          setPlayerInput(0, 0, 0);
          clearInterval(interval);
          resolve(false);
          return;
        }
      } else {
        stuckCount = 0;
        lastY = currentPos.y;
      }
      
      if (checkCount % 20 === 0) {
        setPlayerInput(0, dirY, 10000);
      }
      
      if (Math.abs(currentPos.y - targetY) < threshold) {
        setPlayerInput(0, 0, 0);
        clearInterval(interval);
        setTimeout(() => resolve(true), 100);
      }
    }, 5);
  });
}

function moveToColHelper(targetCol, maxTimeMs = 5000) {
  const cellSize = 64;
  const targetX = targetCol * cellSize + cellSize / 2;
  const threshold = 5;
  const startTime = Date.now();
  
  const startPos = getPlayerPosition();
  const dx = targetX - startPos.x;
  const dirX = dx > 0 ? 1 : -1;
  
  let checkCount = 0;
  let lastX = startPos.x;
  let stuckCount = 0;
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (Date.now() - startTime >= maxTimeMs) {
        setPlayerInput(0, 0, 0);
        clearInterval(interval);
        resolve(false);
        return;
      }
      
      const currentPos = getPlayerPosition();
      checkCount++;
      
      if (Math.abs(currentPos.x - lastX) < 1) {
        stuckCount++;
        if (stuckCount > 40) {
          setPlayerInput(0, 0, 0);
          clearInterval(interval);
          resolve(false);
          return;
        }
      } else {
        stuckCount = 0;
        lastX = currentPos.x;
      }
      
      if (checkCount % 20 === 0) {
        setPlayerInput(dirX, 0, 10000);
      }
      
      if (Math.abs(currentPos.x - targetX) < threshold) {
        setPlayerInput(0, 0, 0);
        clearInterval(interval);
        setTimeout(() => resolve(true), 100);
      }
    }, 5);
  });
}

function moveToCellHelper(targetCol, targetRow, maxTimeMs = 2000) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const gridPos = player.require(window.GridPositionComponent);
  const transform = player.require(window.TransformComponent);
  
  const targetX = targetCol * scene.grid.cellSize + scene.grid.cellSize / 2;
  const targetY = targetRow * scene.grid.cellSize + scene.grid.cellSize / 2;
  
  const dx = targetX > transform.x ? 1 : (targetX < transform.x ? -1 : 0);
  const dy = targetY > transform.y ? 1 : (targetY < transform.y ? -1 : 0);
  
  const remoteInput = enableRemoteInput();
  remoteInput.setWalk(dx, dy, true);
  
  const startTime = Date.now();
  let lastX = transform.x;
  let lastY = transform.y;
  let stuckCount = 0;
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Reached target
      if (gridPos.currentCell.col === targetCol && gridPos.currentCell.row === targetRow) {
        remoteInput.setWalk(0, 0, false);
        clearInterval(checkInterval);
        resolve({ reached: true, col: gridPos.currentCell.col, row: gridPos.currentCell.row });
        return;
      }
      
      // Check if stuck (not moving)
      const movedX = Math.abs(transform.x - lastX);
      const movedY = Math.abs(transform.y - lastY);
      
      if (movedX < 1 && movedY < 1) {
        stuckCount++;
        if (stuckCount >= 10) { // Stuck for 500ms (10 * 50ms)
          remoteInput.setWalk(0, 0, false);
          clearInterval(checkInterval);
          resolve({ reached: false, col: gridPos.currentCell.col, row: gridPos.currentCell.row });
          return;
        }
      } else {
        stuckCount = 0;
        lastX = transform.x;
        lastY = transform.y;
      }
      
      // Timeout
      if (Date.now() - startTime >= maxTimeMs) {
        remoteInput.setWalk(0, 0, false);
        clearInterval(checkInterval);
        resolve({ reached: false, col: gridPos.currentCell.col, row: gridPos.currentCell.row });
      }
    }, 50);
  });
}


// Expose ProjectileComponent for tests
window.ProjectileComponent = window.ProjectileComponent || (() => {
  const { ProjectileComponent } = window;
  return ProjectileComponent;
})();

function holdFire(aimDx, aimDy, durationMs) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const remoteInput = player.get(window.RemoteInputComponent);
  
  remoteInput.setAimInput(aimDx, aimDy);
  remoteInput.setFirePressed(true);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      remoteInput.setFirePressed(false);
      resolve();
    }, durationMs);
  });
}

function waitForFullAmmo() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const ammo = player.get(window.AmmoComponent);
  const maxAmmo = window.PLAYER_MAX_AMMO;
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (ammo.getCurrentAmmo() >= maxAmmo) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}


window.traceBullet = function(dirX, dirY, durationMs) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const input = player.require(window.RemoteInputComponent);
  const grid = scene.grid;
  
  const trace = {
    cells: [],
    startLayer: null,
    endLayer: null,
    destroyed: false,
    maxY: -Infinity
  };
  
  let trackedBulletId = null;
  
  input.setAimInput(dirX, dirY);
  input.setFirePressed(true);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const checkInterval = setInterval(() => {
        const bullets = scene.entityManager.getByType('bullet');
        
        if (bullets.length > 0 && trackedBulletId === null) {
          trackedBulletId = bullets[0].id;
        }
        
        const trackedBullet = bullets.find(b => b.id === trackedBulletId);
        
        if (trackedBullet) {
          const transform = trackedBullet.require(window.TransformComponent);
          const projectile = trackedBullet.require(window.ProjectileComponent);
          
          const cell = grid.worldToCell(transform.x, transform.y);
          const cellKey = `${cell.col},${cell.row}`;
          
          if (trace.cells.length === 0 || trace.cells[trace.cells.length - 1] !== cellKey) {
            trace.cells.push(cellKey);
          }
          
          if (trace.startLayer === null) {
            trace.startLayer = projectile.currentLayer;
          }
          trace.endLayer = projectile.currentLayer;
          
          if (transform.y > trace.maxY) {
            trace.maxY = transform.y;
          }
        } else if (trackedBulletId !== null) {
          trace.destroyed = true;
          clearInterval(checkInterval);
          input.setFirePressed(false);
          input.setAimInput(0, 0);
          resolve(trace);
        }
      }, 16);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        input.setFirePressed(false);
        input.setAimInput(0, 0);
        resolve(trace);
      }, durationMs);
    }, 100);
  });
};
