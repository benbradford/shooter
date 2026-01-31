function getPlayerPosition() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  return { x: transform.x, y: transform.y };
}

function enableRemoteInput() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  
  // Check if already has RemoteInputComponent
  let remoteInput = player.get(window.RemoteInputComponent);
  if (!remoteInput) {
    remoteInput = player.add(new window.RemoteInputComponent());
    console.log('[DEBUG] Remote input enabled');
  }
  return remoteInput;
}

function setPlayerInput(dx, dy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setWalk(dx, dy, true);
  console.log(`[DEBUG] Player walk input set to (${dx}, ${dy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setWalk(0, 0, false);
      console.log('[DEBUG] Player walk input cleared');
      setTimeout(resolve, 100);
    }, durationMs);
  });
}

function fireWeapon(aimDx, aimDy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setAim(aimDx, aimDy, true);
  console.log(`[DEBUG] Firing weapon in direction (${aimDx}, ${aimDy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      console.log('[DEBUG] Stopped firing');
      setTimeout(resolve, 100);
    }, durationMs);
  });
}

function getBulletCount() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const bullets = scene.entityManager.getByType('bullet');
  return bullets.length;
}

function movePlayer(dx, dy) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  transform.x += dx;
  transform.y += dy;
  console.log(`[TEST] Player moved to (${transform.x}, ${transform.y})`);
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
