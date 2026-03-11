# Asset Management System - Implementation Clarifications

## Critical Design Decisions (Finalized)

### 1. Singleton Pattern ✓
- **What**: AssetManager is a singleton accessible globally
- **Why**: Single source of truth for all asset dependencies across scenes
- **How**: Private constructor + static getInstance()

### 2. Dependency Types ✓
- **What**: Only track 'animation' and 'tileset' types initially
- **Why**: These are the only dependencies that cause crashes when stale
- **How**: Union type `'animation' | 'tileset'`

### 3. Automatic Cleanup Order ✓
- **What**: Dependencies cleaned up before parent asset
- **Why**: Prevents accessing destroyed texture data
- **How**: Iterate dependencies first, then remove asset

### 4. No Breaking Changes ✓
- **What**: Keep existing AssetLoader for loading, only manage unloading
- **Why**: Minimize refactoring, reduce risk
- **How**: AssetManager only handles unload() and dependency tracking

### 5. Idempotent Operations ✓
- **What**: Unloading non-existent asset is safe (no error)
- **Why**: Simplifies calling code, handles edge cases
- **How**: Check existence before removing

## API Summary

```typescript
class AssetManager {
  static getInstance(): AssetManager
  
  registerDependency(assetKey: string, type: 'animation' | 'tileset', dependencyKey: string): void
  unload(scene: Phaser.Scene, assetKey: string): void
  unloadBatch(scene: Phaser.Scene, assetKeys: string[]): void
  getDependencies(assetKey: string): Dependency[]
  clear(): void
}
```

## Implementation Order

1. **Phase 1** (55 min): Create AssetManager with core functionality
2. **Phase 2** (20 min): Integrate with GameSceneRenderer and GameScene
3. **Phase 3** (30 min): Test and document

## Key Patterns to Follow

### Registering Dependencies

```typescript
// After creating any asset-dependent resource
if (!scene.anims.exists(animKey)) {
  scene.anims.create({ ... });
  AssetManager.getInstance().registerDependency(textureKey, 'animation', animKey);
}
```

### Unloading Assets

```typescript
// Replace manual cleanup
const assetManager = AssetManager.getInstance();
assetManager.unloadBatch(scene, unusedTextures);
```

### No Manual Cleanup

```typescript
// ❌ Don't do this anymore
if (this.anims.exists(animKey)) {
  this.anims.remove(animKey);
}

// ✅ AssetManager handles it automatically
```

## Testing Strategy

**Manual test**: Enter/exit house3_interior 5 times
**Expected**: No crashes, animations play correctly each time
**Verify**: Check console for no error logs

## Success Criteria

- [ ] AssetManager singleton created
- [ ] Dependencies tracked in Map
- [ ] unload() cleans up animations before texture
- [ ] GameSceneRenderer registers animation dependencies
- [ ] GameScene uses AssetManager for unloading
- [ ] Manual cleanup code removed from GameScene
- [ ] Can enter/exit house3_interior without crashes
- [ ] Build and lint pass
