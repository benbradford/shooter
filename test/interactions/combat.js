function getPunchState() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const combo = player.get(window.AttackComboComponent);
  if (!combo) return null;
  return {
    isPunching: combo.isPunching(),
    isMovementLocked: combo.isMovementLocked(),
    isFacingLocked: combo.isFacingLocked()
  };
}

function isPunching() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const combo = player.get(window.AttackComboComponent);
  return combo ? combo.isPunching() : false;
}

function getEnemyHealth(entityId) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const entity = scene.entityManager.getAll().find(e => e.entityId === entityId || e.id === entityId);
  if (!entity) return null;
  const health = entity.get(window.HealthComponent);
  if (!health) return null;
  return health.getHealth();
}

function getEnemyCount() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  return scene.entityManager.getAll().filter(e => e.tags.has('enemy')).length;
}

function getAllEnemies() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const enemies = scene.entityManager.getAll().filter(e => e.tags.has('enemy'));
  return enemies.map(e => {
    const transform = e.get(window.TransformComponent);
    const health = e.get(window.HealthComponent);
    return {
      id: e.entityId || e.id,
      health: health ? health.getHealth() : null,
      x: transform ? transform.x : null,
      y: transform ? transform.y : null
    };
  });
}

function waitForPunchComplete(maxMs = 1000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (!isPunching() || Date.now() - startTime >= maxMs) {
        clearInterval(interval);
        resolve(!isPunching());
      }
    }, 16);
  });
}
