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
    console.log('[TEST] Remote input enabled');
  }
  return remoteInput;
}

function setPlayerInput(dx, dy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setWalk(dx, dy, true);
  console.log(`[TEST] Player walk input set to (${dx}, ${dy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setWalk(0, 0, false);
      console.log('[TEST] Player walk input cleared');
      setTimeout(resolve, 100);
    }, durationMs);
  });
}

function fireWeapon(aimDx, aimDy, durationMs) {
  const remoteInput = enableRemoteInput();
  
  remoteInput.setAim(aimDx, aimDy, true);
  console.log(`[TEST] Firing weapon in direction (${aimDx}, ${aimDy})`);
  
  return new Promise(resolve => {
    setTimeout(() => {
      remoteInput.setAim(0, 0, false);
      console.log('[TEST] Stopped firing');
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
