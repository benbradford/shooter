function getPlayerPosition() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  return { x: transform.x, y: transform.y };
}

function movePlayer(dx, dy) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const transform = player.require(window.TransformComponent);
  transform.x += dx;
  transform.y += dy;
  console.log(`[TEST] Player moved to (${transform.x}, ${transform.y})`);
}
