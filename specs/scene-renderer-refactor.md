# Scene Renderer Refactor Spec

## Problem

The current `GameSceneRenderer.renderGrid()` method is called every frame and mixes multiple responsibilities:
- Checking if assets are ready
- Creating sprites (once, with cache checks)
- Drawing graphics (every frame)
- Managing multiple cache states (`isCached`, `renderedCellTextures`)

This makes it difficult to understand:
- When sprites are actually created
- What order sprites are created in
- Why timing of `this.load.start()` affects sprite rendering order
- Whether all assets are loaded before sprites are created

## Goal

Separate sprite creation (once) from graphics rendering (every frame) to make the flow explicit and debuggable.

## Proposed Architecture

### Phase 1: Asset Loading (Once)

```typescript
async loadAllAssets(levelData: LevelData): Promise<void> {
  // Queue all assets
  preloadLevelAssets(this.scene, levelData);

  // Start loading
  this.scene.load.start();

  // Wait for completion
  if (this.scene.load.isLoading()) {
    await new Promise<void>(resolve => {
      this.scene.load.once('complete', () => resolve());
    });
  }

  // Generate runtime tilesets (water, paths)
  await this.prepareRuntimeTilesets(levelData);
}
```

**Key:** All assets loaded and tilesets generated BEFORE any sprite creation.

### Phase 2: Sprite Creation (Once)

```typescript
initializeSprites(grid: Grid, levelData: LevelData): void {
  // Create sprites in explicit order (lowest to highest depth)
  this.createFloorSprites(grid, levelData);
  this.createWaterTileSprites(grid, levelData);
  this.createBackgroundTextureSprites(grid, levelData);
  this.createPlatformSprites(grid, levelData);
  this.createStairsSprites(grid, levelData);
  this.createWallSprites(grid, levelData);

  // Mark as initialized
  this.spritesInitialized = true;
}
```

**Key:** All sprites created in one pass, in explicit depth order. No cache checks needed.

### Phase 3: Graphics Updates (Every Frame)

```typescript
updateGraphics(grid: Grid, levelData: LevelData): void {
  // Only draw graphics, never create sprites
  this.graphics.clear();
  this.edgeGraphics.clear();

  this.drawPlatformEdges(grid);
  this.drawShadows(grid);
  this.drawEdgeDarkening(grid, levelData);
}
```

**Key:** No sprite creation, only graphics operations. Fast.

### Phase 4: Water Animation (Every Frame)

```typescript
updateAnimations(delta: number): void {
  if (this.waterAnimator) {
    this.waterAnimator.update(delta, this.waterSprites);
  }
}
```

**Key:** Separate from graphics updates.

## GameScene Flow

### Current (Unclear)
```typescript
async create() {
  preloadLevelAssets(this.levelData);
  // ... complex promise with timing issues
  await prepareRuntimeTilesets();
  markAssetsReady();
  await initializeScene();  // Calls renderGrid() which creates sprites
}

update(delta) {
  renderGrid();  // Runs every frame, has cache checks
}
```

### Proposed (Clear)
```typescript
async create() {
  // Phase 1: Load everything
  await this.sceneRenderer.loadAllAssets(this.levelData);

  // Phase 2: Create background/vignette
  const { background, vignette } = this.sceneRenderer.renderTheme(width, height);

  // Phase 3: Initialize grid
  await this.initializeScene();

  // Phase 4: Create all sprites in order
  this.sceneRenderer.initializeSprites(this.grid, this.levelData);

  // Phase 5: Spawn entities
  this.spawnEntities();
}

update(delta) {
  this.sceneRenderer.updateGraphics(this.grid, this.levelData);
  this.sceneRenderer.updateAnimations(delta);
}
```

## Benefits

1. **Explicit ordering** - Can see exactly when each sprite is created
2. **No timing ambiguity** - Assets loaded before sprites created, period
3. **Debuggable** - Add logging to each phase to see what's happening
4. **No cache checks in hot path** - `updateGraphics()` never checks if sprites exist
5. **Clear responsibilities** - Each method does ONE thing
6. **Same performance** - Sprites still created once, graphics still updated every frame
7. **Keep existing cache** - `isCached` still used, just clearer when it's set

## Implementation Steps

1. Rename `renderGrid()` to `updateGraphics()`
2. Extract sprite creation into `initializeSprites()`
3. Move `initializeSprites()` call to `create()` after `initializeScene()`
4. Remove `assetsReady` check from `updateGraphics()` (assets guaranteed ready)
5. Remove sprite creation code from `updateGraphics()`

## Why This Fixes The Rock Issue

Currently, we don't know exactly when background texture sprites are created relative to when the player sprite is created. The cache checks and `assetsReady` flag make it unclear.

After refactor, the order is explicit:
1. `loadAllAssets()` - all textures loaded
2. `initializeSprites()` - rock sprite created at depth -80
3. `spawnEntities()` - player sprite created at depth 0
4. Player created AFTER rock, with higher depth → renders on top

No timing dependencies, no cache confusion, just explicit ordering.

## What We Keep

- Cache system (`isCached`, `renderedCellTextures`) - still used
- Performance - sprites still created once
- Current depth constants - no changes needed
- Water animation system - still works

## What Changes

- `renderGrid()` split into `initializeSprites()` + `updateGraphics()`
- Sprite creation happens once in `create()`, not checked every frame
- Clear separation: load → create → update
