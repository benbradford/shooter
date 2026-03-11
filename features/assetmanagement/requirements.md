# Asset Management System - Requirements

## Overview

Create a centralized asset lifecycle management system that tracks asset dependencies and ensures proper cleanup when assets are unloaded.

## Current Problems

1. **Stale references**: Animations reference texture frames that become invalid after texture unload/reload
2. **Manual cleanup**: Must remember to clean up animations when unloading textures
3. **Scattered logic**: Asset loading in AssetLoader, unloading in GameScene, animation creation in GameSceneRenderer
4. **No dependency tracking**: Nothing knows that `sconce_flame_anim` depends on `sconce_flame` texture
5. **Fragile**: Adding new asset types (tilesets, particle configs) requires manual cleanup code

## Goals

1. **Automatic cleanup**: Unloading an asset automatically cleans up all dependents
2. **Centralized**: Single source of truth for what's loaded and what depends on what
3. **Type-safe**: Track different dependency types (animations, tilesets, particle configs)
4. **Simple API**: Easy to register dependencies and unload assets
5. **No breaking changes**: Integrate with existing AssetLoader and GameSceneRenderer

## Requirements

### R1: Asset Dependency Registry

**Purpose**: Track what assets are loaded and what depends on them

**API**:
```typescript
class AssetManager {
  registerDependency(assetKey: string, dependencyType: DependencyType, dependencyKey: string): void
  unregisterDependency(assetKey: string, dependencyKey: string): void
  getDependencies(assetKey: string): Dependency[]
  isLoaded(assetKey: string): boolean
}

type DependencyType = 'animation' | 'tileset' | 'particle_config';

type Dependency = {
  type: DependencyType;
  key: string;
}
```

**Acceptance Criteria**:
- Can register multiple dependencies per asset
- Can query all dependencies for an asset
- Can unregister individual dependencies
- Returns empty array if asset has no dependencies

### R2: Asset Unloading with Cleanup

**Purpose**: Unload assets and automatically clean up all dependents

**API**:
```typescript
class AssetManager {
  unload(scene: Phaser.Scene, assetKey: string): void
}
```

**Behavior**:
1. Get all dependencies for the asset
2. For each dependency:
   - If type is 'animation': Call `scene.anims.remove(dependencyKey)`
   - If type is 'tileset': Call `scene.textures.remove(dependencyKey)`
   - If type is 'particle_config': Remove from particle config registry
3. Remove the asset itself: `scene.textures.remove(assetKey)`
4. Clear dependency registry for this asset

**Acceptance Criteria**:
- Animations are removed before texture
- Tilesets are removed before source texture
- No errors when unloading asset with no dependencies
- No errors when unloading asset that doesn't exist

### R3: Batch Unloading

**Purpose**: Unload multiple assets efficiently

**API**:
```typescript
class AssetManager {
  unloadBatch(scene: Phaser.Scene, assetKeys: string[]): void
}
```

**Acceptance Criteria**:
- Unloads all assets in order
- Cleans up dependencies for each
- No duplicate cleanup if dependencies overlap

### R4: Integration with GameSceneRenderer

**Purpose**: Automatically register animation dependencies when creating animations

**Changes to GameSceneRenderer**:
```typescript
// In createBackgroundTextureSprites()
if (!this.scene.anims.exists(animationKey)) {
  this.scene.anims.create({ ... });
  assetManager.registerDependency(config.spritesheet, 'animation', animationKey);
}
```

**Acceptance Criteria**:
- All created animations are registered
- No manual cleanup needed in renderer
- Works for both static and animated textures

### R5: Integration with GameScene

**Purpose**: Use AssetManager for all asset unloading

**Changes to GameScene.loadLevel()**:
```typescript
// Replace manual unloading
unusedTextures.forEach(tex => {
  assetManager.unload(this, tex);
});
```

**Acceptance Criteria**:
- All texture unloading goes through AssetManager
- Animations are automatically cleaned up
- No manual `anims.remove()` calls needed

## Non-Requirements

- **Asset loading**: Keep existing AssetLoader - only manage unloading
- **Preloading**: Don't change how assets are initially loaded
- **Asset groups**: Keep existing ASSET_GROUPS structure
- **Level asset detection**: Keep existing getBackgroundTextures() logic

## Success Criteria

1. Can enter/exit house3_interior multiple times without crashes
2. No manual animation cleanup in GameScene
3. AssetManager tracks all animation dependencies
4. Unloading a texture automatically removes its animations
5. Code is simpler and more maintainable than current approach

## Files to Create

- `src/systems/AssetManager.ts` - Core asset lifecycle manager

## Files to Modify

- `src/scenes/theme/GameSceneRenderer.ts` - Register animation dependencies
- `src/scenes/GameScene.ts` - Use AssetManager for unloading
- `src/ecs/index.ts` - Export AssetManager (if needed)
