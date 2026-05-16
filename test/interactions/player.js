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

function punch(dirX = 0, dirY = 1) {
  const remoteInput = enableRemoteInput();
  remoteInput.setAim(dirX, dirY, true);
  testLog(`[DEBUG] Punch triggered in direction (${dirX}, ${dirY})`);

  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      resolve();
    }, 100);
  });
}

function punchAndWait(dirX = 0, dirY = 1, waitMs = 600) {
  const remoteInput = enableRemoteInput();
  remoteInput.setAim(dirX, dirY, true);
  testLog(`[DEBUG] Punch and wait in direction (${dirX}, ${dirY})`);

  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      setTimeout(resolve, waitMs);
    }, 100);
  });
}

function chargeSuperPunch(dirX = 0, dirY = 1, holdMs = 1200) {
  const remoteInput = enableRemoteInput();
  remoteInput.setAim(dirX, dirY, true);
  testLog(`[DEBUG] Charging super punch for ${holdMs}ms`);

  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      testLog('[DEBUG] Super punch released');
      setTimeout(resolve, 600);
    }, holdMs);
  });
}

function getAttackButtonState() {
  const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
  if (!hudScene || !hudScene.attackButtonEntity) return null;
  const btn = hudScene.attackButtonEntity.get(window.AttackButtonComponent);
  if (!btn) return null;
  return {
    visible: btn.sprite ? btn.sprite.visible : false,
    texture: btn.sprite ? btn.sprite.texture.key : null
  };
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


