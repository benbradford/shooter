// Sprite rendering depths (lowest to highest)
// Lower values render behind higher values

export const Depth = {
  // Background layers
  floor: -1000,
  overlay: -950,
  waterTile: -100,
  gridGraphics: -100,
  ripple: -90,
  waterTexture: -80,
  shadowSwimming: -80,
  playerSwimming: -70,
  waterEdge: -60,
  exhaustedBase: -50,
  bridge: -50,
  platform: -50,
  stairs: -50,
  wall: -50,
  cellTexture: -40,
  edgeGraphics: 0,
  shadow: -10,
  rendererGraphics: -10,
  waterTileEdge: -9,
  cellTextureModified: -4,

  // Entities
  player: 0,
  enemy: 0,
  enemyFlying: 10,
  projectile: 0,
  projectileFlying: 10,
  projectileHigh: 100,
  pickup: 0,
  spawnSmoke: 100,

  // Effects
  particle: 1000,
  particleBehind: -1,
  particleFront: 2000,
  mist: 1500,
  hitFlash: 900,

  // UI
  hud: 2000,
  hudCircle: 1999,
  hudFront: 2001,
  hudOverheal: 1002,
  hudSparkles: 1003,
  editor: 1000,
  editorFront: 1001,
  editorTrigger: 1500,
  editorHighlight: 950,
  vignette: 998,
  debug: 999,
  debugText: 10001,
  fade: 100000,
} as const;
