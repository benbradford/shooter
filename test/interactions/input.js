function getJoystickState() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const joystick = scene.entityManager.getFirst('joystick');
  if (!joystick) return { error: 'No joystick found' };
  const touchJoystick = joystick.components.find(c => c.constructor.name === 'TouchJoystickComponent');
  if (!touchJoystick) return { error: 'No TouchJoystickComponent found' };
  return touchJoystick.getJoystickState();
}

function touchJoystick(startX, startY, endX, endY, durationMs) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  
  const createPointer = (x, y, id, isDown) => ({
    x, y,
    worldX: x,
    worldY: y,
    id,
    isDown,
    downX: startX,
    downY: startY,
    upX: x,
    upY: y,
    button: 0,
    buttons: isDown ? 1 : 0
  });
  
  const downPointer = createPointer(startX, startY, 1, true);
  scene.input.emit('pointerdown', downPointer);
  console.log(`[TEST] Touch down at (${startX}, ${startY})`);
  
  const movePointer = createPointer(endX, endY, 1, true);
  scene.input.emit('pointermove', movePointer);
  console.log(`[TEST] Touch drag to (${endX}, ${endY})`);
  
  // Game needs to update while holding - wait for actual game frames
  return new Promise(resolve => {
    setTimeout(() => {
      const upPointer = createPointer(endX, endY, 1, false);
      scene.input.emit('pointerup', upPointer);
      console.log(`[TEST] Touch released`);
      
      // Wait one more frame after release for physics to settle
      setTimeout(resolve, 100);
    }, durationMs);
  });
}
