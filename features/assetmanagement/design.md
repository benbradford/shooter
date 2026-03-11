# Asset Management System - Design

## Architecture Overview

```
AssetManager (Singleton)
├── dependencies: Map<assetKey, Dependency[]>
├── registerDependency(assetKey, type, key)
├── unload(scene, assetKey)
└── unloadBatch(scene, assetKeys[])

GameSceneRenderer
├── createBackgroundTextureSprites()
│   └── Registers animation dependencies
└── No manual cleanup needed

GameScene.loadLevel()
├── Calculates unused textures
└── Calls assetManager.unloadBatch(unusedTextures)
```

## Data Structures

### Dependency Tracking

```typescript
type DependencyType = 'animation' | 'tileset';

type Dependency = {
  type: DependencyType;
  key: string;
}

class AssetManager {
  private dependencies: Map<string, Dependency[]> = new Map();
}
```

**Why Map<string, Dependency[]>?**
- Fast lookup by asset key
- One asset can have multiple dependencies
- Easy to iterate and clean up

### Singleton Pattern

```typescript
class AssetManager {
  private static instance: AssetManager;
  
  private constructor() {}
  
  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }
}
```

**Why singleton?**
- Single source of truth for all asset dependencies
- Accessible from any scene or component
- Persists across scene transitions

## Component Design

### AssetManager

**Responsibilities:**
- Track asset dependencies
- Unload assets with automatic cleanup
- Provide query interface

**Key Methods:**

```typescript
registerDependency(assetKey: string, dependencyType: DependencyType, dependencyKey: string): void {
  if (!this.dependencies.has(assetKey)) {
    this.dependencies.set(assetKey, []);
  }
  
  const deps = this.dependencies.get(assetKey)!;
  
  // Don't register duplicates
  if (deps.some(d => d.key === dependencyKey)) {
    return;
  }
  
  deps.push({ type: dependencyType, key: dependencyKey });
}

unload(scene: Phaser.Scene, assetKey: string): void {
  const deps = this.dependencies.get(assetKey) ?? [];
  
  // Clean up dependencies first
  for (const dep of deps) {
    if (dep.type === 'animation') {
      if (scene.anims.exists(dep.key)) {
        scene.anims.remove(dep.key);
      }
    } else if (dep.type === 'tileset') {
      if (scene.textures.exists(dep.key)) {
        scene.textures.remove(dep.key);
      }
    }
  }
  
  // Remove the asset itself
  if (scene.textures.exists(assetKey)) {
    scene.textures.remove(assetKey);
  }
  
  // Clear dependency tracking
  this.dependencies.delete(assetKey);
}

unloadBatch(scene: Phaser.Scene, assetKeys: string[]): void {
  for (const key of assetKeys) {
    this.unload(scene, key);
  }
}
```

## Integration Points

### GameSceneRenderer Integration

**Location**: `createBackgroundTextureSprites()` after creating animation

```typescript
// Create animation if it doesn't exist
const animationKey = `${config.spritesheet}_anim`;
if (!this.scene.anims.exists(animationKey)) {
  this.scene.anims.create({
    key: animationKey,
    frames: this.scene.anims.generateFrameNumbers(config.spritesheet, {
      start: 0,
      end: config.frameCount - 1
    }),
    frameRate: config.frameRate,
    repeat: -1
  });
  
  // Register dependency
  const assetManager = AssetManager.getInstance();
  assetManager.registerDependency(config.spritesheet, 'animation', animationKey);
}
```

### GameScene Integration

**Location**: `loadLevel()` where textures are unloaded

```typescript
// Before:
unusedTextures.forEach(tex => {
  if (this.textures.exists(tex)) {
    // Remove associated animations
    const animKey = `${tex}_anim`;
    if (this.anims.exists(animKey)) {
      this.anims.remove(animKey);
    }
    this.textures.remove(tex);
  }
});

// After:
const assetManager = AssetManager.getInstance();
assetManager.unloadBatch(this, unusedTextures);
```

### Future: PathTilesetGenerator Integration

When we generate runtime tilesets, register them:

```typescript
const tilesetKey = `${sourceTexture}_generated_tileset`;
generator.generateTileset(sourceTexture, tilesetKey);
assetManager.registerDependency(sourceTexture, 'tileset', tilesetKey);
```

## Error Handling

**Missing asset**: Silently skip (asset might already be unloaded)
**Missing dependency**: Silently skip (dependency might already be cleaned up)
**Invalid dependency type**: Log warning but continue

## Performance Considerations

- Map lookups are O(1)
- Dependency arrays are small (typically 1-3 items)
- Batch unloading is O(n) where n = number of assets
- No performance impact on gameplay (only runs during level transitions)

## Testing Strategy

1. **Unit test**: Register/unregister dependencies
2. **Integration test**: Create animation, unload texture, verify animation removed
3. **Manual test**: Enter/exit house3_interior multiple times
4. **Regression test**: Ensure existing levels still work

## Migration Path

1. Create AssetManager with basic functionality
2. Update GameSceneRenderer to register animation dependencies
3. Update GameScene to use AssetManager for unloading
4. Remove manual animation cleanup code
5. Test thoroughly
6. (Future) Add tileset dependency tracking
7. (Future) Add particle config dependency tracking
