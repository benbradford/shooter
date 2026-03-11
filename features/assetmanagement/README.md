# Asset Management System - Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the asset management system from features/assetmanagement/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [x] Implementation clarifications written
- [x] AssetManager class created
- [x] GameSceneRenderer integration
- [x] GameScene integration
- [x] Testing complete (manual - works correctly)

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **implementation-clarifications.md** ⭐ - Quick reference for implementation
3. **requirements.md** - What the system does
4. **design.md** - How it works
5. **tasks.md** - Step-by-step implementation

### Critical Design Decisions

1. **Singleton pattern** - Single AssetManager instance across all scenes
2. **Dependency tracking** - Map<assetKey, Dependency[]> for fast lookup
3. **Automatic cleanup** - Unloading asset automatically removes dependents
4. **Two dependency types** - 'animation' and 'tileset' (extensible)
5. **No breaking changes** - Keep existing AssetLoader, only manage unloading

### Current Problem Being Solved

**Bug**: Animated textures crash when re-entering a level because:
1. Texture is unloaded when leaving level
2. Animation still exists with stale frame references
3. Texture is reloaded when re-entering
4. Animation plays but references null frame data → crash

**Current workaround**: Manual `anims.remove()` in GameScene.loadLevel()

**Proper solution**: AssetManager tracks that animation depends on texture, automatically removes animation when texture is unloaded

### Example Usage

```typescript
// Register dependency (in GameSceneRenderer)
const assetManager = AssetManager.getInstance();
assetManager.registerDependency('sconce_flame', 'animation', 'sconce_flame_anim');

// Unload with automatic cleanup (in GameScene)
assetManager.unloadBatch(this, ['sconce_flame', 'other_texture']);
// Animation 'sconce_flame_anim' is automatically removed first
```

### Success Criteria

- [ ] Can enter/exit house3_interior multiple times without crashes
- [ ] No manual animation cleanup in GameScene
- [ ] All animations registered as dependencies
- [ ] Build and lint pass with zero errors

### Files to Create

- `src/systems/AssetManager.ts`

### Files to Modify

- `src/scenes/theme/GameSceneRenderer.ts` - Register animation dependencies
- `src/scenes/GameScene.ts` - Use AssetManager for unloading

### Estimated Implementation Time

**Total**: ~2 hours

**Breakdown**:
- Core AssetManager: 55 minutes
- Integration: 20 minutes
- Testing: 30 minutes
- Documentation: 15 minutes
