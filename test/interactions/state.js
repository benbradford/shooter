function getPlayerState() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const sm = player.get(window.StateMachineComponent);
  if (!sm) return null;
  return sm.stateMachine.getCurrentKey();
}

function getPlayerHealth() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const health = player.get(window.HealthComponent);
  if (!health) return null;
  return health.getHealth();
}

function getPlayerMaxHealth() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const health = player.get(window.HealthComponent);
  if (!health) return null;
  return health.getMaxHealth();
}

function isPlayerDead() {
  const health = getPlayerHealth();
  return health !== null && health <= 0;
}

function setPlayerHealth(value) {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const health = player.get(window.HealthComponent);
  if (health) health.setHealth(value);
}

function isPlayerInWater() {
  const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
  const player = scene.entityManager.getFirst('player');
  const water = player.get(window.WaterEffectComponent);
  if (!water) return false;
  return water.getIsInWater();
}
