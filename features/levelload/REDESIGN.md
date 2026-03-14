# Level Loading System - Complete Redesign

## Executive Summary

**Current system is fundamentally broken.** ChatGPT identified 6 critical bugs that require architectural changes, not patches.

**Recommendation: Complete rewrite following ChatGPT's 3-tier asset system + reference counting.**

## Critical Bugs Identified by ChatGPT

### Bug 1: Manual children.removeAll() ❌ CRITICAL
**Current code:**
```typescript
gameScene.children.removeAll(true);
```

**Problem:** Destroys objects before Phaser's scene shutdown, causing double-destroy crashes.

**Fix:** Remove entirely. Let Phaser handle destruction.

### Bug 2: Texture unload timing ❌ CRITICAL
**Current code:**
```typescript
this.scene.stop('game');
this.unloadPreviousLevelAssets(levelData); // Immediate
```

**Problem:** Unloads textures before scene shutdown completes. Text objects still reference CanvasTextures.

**Fix:** Wait for shutdown event:
```typescript
this.scene.get('game').events.once('shutdown', () => {
  this.unloadPreviousLevelAssets(levelData);
});
```

### Bug 3: CanvasTexture crash ❌ CRITICAL
**Problem:** Text.destroy() tries to remove CanvasTexture from TextureManager, but texture already removed.

**Fix:** Unload textures AFTER scene shutdown (see Bug 2).

### Bug 4: Animation references ❌ HIGH
**Problem:** Global animations reference unloaded textures.

**Fix:** Remove animations before unloading textures:
```typescript
scene.anims.remove(animKey);
```

### Bug 5: No transition lock ❌ MEDIUM
**Problem:** Rapid transitions cause overlapping loads/unloads.

**Fix:** Add transition lock flag.

### Bug 6: No reference counting ❌ HIGH
**Problem:** Shared assets (player, HUD) get unloaded when still in use.

**Fix:** Implement reference counting (see below).

## ChatGPT's Recommended Architecture

### 3-Tier Asset System

**Tier 1: Core Assets (never unload)**
```typescript
const CORE_ASSETS = new Set([
  'player',
  'attacker', 
  'hud',
  'ui-icons',
  'punch_icon',
  'lips_icon'
]);
```

**Tier 2: Level Assets (load/unload per level)**
- Tilesets
- Enemy sprites
- Level-specific textures

**Tier 3: Runtime Generated (track separately)**
- Runtime tilesets
- CanvasTextures
- Procedural textures

### Reference-Counted Asset Manager

```typescript
class AssetManager {
  private refCounts = new Map<string, number>();
  
  retain(key: string): void {
    const count = this.refCounts.get(key) ?? 0;
    this.refCounts.set(key, count + 1);
  }
  
  release(key: string): void {
    const count = this.refCounts.get(key);
    if (!count) return;
    
    if (count <= 1) {
      this.refCounts.delete(key);
    } else {
      this.refCounts.set(key, count - 1);
    }
  }
  
  canUnload(key: string): boolean {
    return !this.refCounts.has(key);
  }
  
  unloadUnused(scene: Phaser.Scene): void {
    const textures = scene.textures.getTextureKeys();
    
    for (const key of textures) {
      if (CORE_ASSETS.has(key)) continue;
      if (!this.canUnload(key)) continue;
      
      // Remove animations first
      const animKey = `${key}_anim`;
      if (scene.anims.exists(animKey)) {
        scene.anims.remove(animKey);
      }
      
      scene.textures.remove(key);
    }
  }
}
```

### Scene Asset Registration

**GameScene.create():**
```typescript
const manager = AssetManager.getInstance();
manager.retain('swamp_tiles');
manager.retain('swamp_enemies');
```

**GameScene shutdown event:**
```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  const manager = AssetManager.getInstance();
  manager.release('swamp_tiles');
  manager.release('swamp_enemies');
});
```

### Correct Transition Flow

```
1. Player touches exit
2. Start LoadingScene
3. LoadingScene.init():
   - Store target level data
4. LoadingScene.create():
   - Show loading UI
   - Stop GameScene
   - Register shutdown listener
5. GameScene SHUTDOWN event fires:
   - Release assets (refCount--)
   - AssetManager.unloadUnused()
6. LoadingScene continues:
   - Load new level assets
   - Retain new assets (refCount++)
   - Start GameScene
```

## Implementation Plan

### Phase 1: Fix Critical Bugs (2 hours)

**Task 1.1: Remove manual children.removeAll()**
- Delete from LoadingScene.init()
- Delete from LoadingScene.shutdown()

**Task 1.2: Fix texture unload timing**
- Move unloadPreviousLevelAssets() to shutdown event listener
- Wait for GameScene shutdown before unloading

**Task 1.3: Add transition lock**
- Add static `isTransitioning` flag
- Check before starting transition
- Clear after completion

**Estimated time:** 2 hours
**Risk:** Low (simple fixes)

### Phase 2: Implement Reference Counting (4 hours)

**Task 2.1: Define CORE_ASSETS**
- Create constant set
- Include player, HUD, UI assets

**Task 2.2: Add retain/release to AssetManager**
- Implement refCount map
- Add retain(), release(), canUnload()

**Task 2.3: Update GameScene lifecycle**
- Call retain() in create()
- Call release() in shutdown event

**Task 2.4: Update unloadSafe()**
- Check CORE_ASSETS first
- Check refCount second
- Only unload if both pass

**Estimated time:** 4 hours
**Risk:** Medium (requires careful tracking)

### Phase 3: Runtime Texture Registry (2 hours)

**Task 3.1: Create RuntimeTextureRegistry**
- Track generated textures separately
- Register on creation
- Destroy on level transition

**Task 3.2: Update GameSceneRenderer**
- Register runtime tilesets
- Don't destroy in renderer.destroy()

**Estimated time:** 2 hours
**Risk:** Low (isolated system)

### Phase 4: Testing (3 hours)

**Task 4.1: Create test levels**
- house3_interior → grass_overworld1 (existing)
- Add 3 more test transitions

**Task 4.2: Automated transition test**
- Script that cycles through 10 transitions
- Check for crashes
- Check for memory leaks

**Task 4.3: Manual verification**
- Test on Mac
- Test on Android
- Verify no `__MISSING` textures

**Estimated time:** 3 hours

## Total Estimated Time: 11 hours

## Success Criteria

- ✅ No manual children.removeAll()
- ✅ Textures unloaded AFTER scene shutdown
- ✅ Core assets never unloaded
- ✅ Reference counting prevents premature unload
- ✅ Animations removed before textures
- ✅ Runtime textures tracked separately
- ✅ Transition lock prevents overlapping transitions
- ✅ 10 consecutive transitions without crash
- ✅ Works on Mac and Android
- ✅ No `__MISSING` textures
- ✅ No memory leaks

## Migration Strategy

**Option A: Incremental (safer)**
1. Fix critical bugs first (Phase 1)
2. Test transitions work
3. Add reference counting (Phase 2)
4. Test again
5. Add runtime registry (Phase 3)
6. Final testing (Phase 4)

**Option B: Complete rewrite (faster)**
1. Implement all phases at once
2. Test everything together
3. Higher risk but faster

**Recommendation: Option A (incremental)**

## Files to Modify

**Phase 1:**
- `src/scenes/LoadingScene.ts` - Remove manual destroy, fix timing

**Phase 2:**
- `src/systems/AssetManager.ts` - Add reference counting
- `src/scenes/GameScene.ts` - Add retain/release calls
- `src/constants/CoreAssets.ts` - Define CORE_ASSETS (new file)

**Phase 3:**
- `src/systems/RuntimeTextureRegistry.ts` - Track runtime textures (new file)
- `src/scenes/theme/GameSceneRenderer.ts` - Register runtime textures

**Phase 4:**
- `test/levels/` - Add test levels
- `test/transition-test.js` - Automated test script (new file)

## Risk Assessment

**High Risk:**
- Reference counting bugs (wrong refCount)
- Shutdown event timing (race conditions)
- Animation cleanup (missing animations)

**Medium Risk:**
- Runtime texture tracking (incomplete registry)
- Core asset definition (missing assets)

**Low Risk:**
- Removing manual destroy (simple fix)
- Transition lock (simple flag)

## Rollback Plan

If Phase 2 or 3 fails:
1. Revert to Phase 1 (critical bugs fixed)
2. Keep manual asset tracking (current system)
3. Accept some memory leaks but no crashes

## Next Steps

1. Review this design with user
2. Get approval for incremental vs complete rewrite
3. Start Phase 1 (fix critical bugs)
4. Test after each phase
5. Iterate based on results
