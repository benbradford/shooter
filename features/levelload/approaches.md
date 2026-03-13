# Level Loading System - Approaches and Prerequisite Refactors

## Executive Summary

**The current level loading system is fundamentally broken and needs major refactoring BEFORE implementing LoadingScene.**

The existing code has accumulated so much technical debt that building LoadingScene on top of it would be like building a house on quicksand. The root problems are:

1. **Race conditions everywhere** - Multiple 'complete' listeners, timing dependencies
2. **No verification** - Assumes textures work after 'complete' event
3. **Scattered responsibilities** - Loading logic in 3+ places
4. **Brittle state management** - Manual cleanup, no atomicity
5. **Platform-specific hacks** - Android timing issues papered over

**Recommendation: Refactor first, then implement LoadingScene. Total time will be LESS than working around bad code.**

---

## Prerequisite Refactors

### Refactor 1: Centralize Asset Loading ⭐ CRITICAL

**Current Problem:**
Asset loading is scattered across 3 files with overlapping responsibilities:
- `AssetLoader.ts` - Queues assets, registers 'complete' listener
- `GameScene.loadLevel()` - Queues MORE assets, registers ANOTHER 'complete' listener
- `GameSceneRenderer.loadAllAssets()` - Generates runtime tilesets

This causes race conditions on Android where only one listener fires.

**Code Smell:**
```typescript
// AssetLoader.ts
scene.load.once('complete', () => {
  console.log('[AssetLoader] Loaded X textures');
  if (onComplete) onComplete();
});

// GameScene.loadLevel()
await new Promise<void>(resolve => {
  this.load.once('complete', () => {
    resolve();
  });
});
```

**Why it's bad:**
- Two listeners on same event = race condition
- No guarantee both fire
- No guarantee they fire in order
- Platform-specific behavior (works on Mac, fails on Android)

**Proposed Solution:**
Create `AssetLoadCoordinator` that owns ALL asset loading:

```typescript
class AssetLoadCoordinator {
  async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData
  ): Promise<LoadResult> {
    // Queue all assets
    this.queueAssetGroups(scene, levelData);
    this.queueBackgroundTextures(scene, levelData);
    
    // Single listener
    const result = await this.waitForLoad(scene);
    
    // Verify all textures
    const verified = this.verifyTextures(scene, result.keys);
    
    // Generate runtime tilesets
    const tilesets = await this.generateTilesets(scene, levelData);
    
    return { success: verified && tilesets, failed: [...] };
  }
}
```

**Benefits:**
- Single source of truth
- Single 'complete' listener
- Verification built-in
- Atomic operation (all or nothing)

**Time Estimate:** 3 hours
- Extract logic from AssetLoader: 1h
- Extract logic from GameScene: 1h
- Testing: 1h

**Confidence:** 95% - This is the root cause of Android failures

---

### Refactor 2: Remove loadLevel() from GameScene ⭐ CRITICAL

**Current Problem:**
`GameScene.loadLevel()` is a 200-line monster that does EVERYTHING:
- Calculates texture deltas
- Destroys game objects
- Loads assets
- Unloads assets
- Generates tilesets
- Resets scene
- Initializes sprites

This violates Single Responsibility Principle catastrophically.

**Code Smell:**
```typescript
async loadLevel(levelName: string, spawnCol?: number, spawnRow?: number): Promise<void> {
  // 200 lines of mixed concerns
  this.scene.pause();
  const prevLevelTextures = getBackgroundTextures(this.levelData);
  this.currentLevelName = levelName;
  this.levelData = await LevelLoader.load(levelName);
  const newLevelTextures = getBackgroundTextures(this.levelData);
  const unusedTextures = [...];
  this.time.removeAllEvents();
  this.sceneRenderer.destroy();
  this.children.list.forEach(obj => obj.destroy());
  // ... 150 more lines
}
```

**Why it's bad:**
- Impossible to test individual steps
- Impossible to recover from partial failure
- Impossible to add loading UI
- Impossible to verify state at each step
- Mixed sync and async operations

**Proposed Solution:**
Delete `loadLevel()` entirely. Replace with LoadingScene that orchestrates:

```typescript
// LoadingScene.create()
async loadLevel(): Promise<void> {
  // Step 1: Load level data
  const levelData = await LevelLoader.load(this.targetLevel);
  
  // Step 2: Load assets (coordinator handles everything)
  const assetResult = await AssetLoadCoordinator.loadLevelAssets(this, levelData);
  if (!assetResult.success) {
    this.showError(assetResult.failed);
    return;
  }
  
  // Step 3: Initialize GameScene
  this.scene.start('GameScene', { levelData, spawnCol, spawnRow });
}
```

**Benefits:**
- Clear separation of concerns
- Each step can fail independently
- Easy to add progress tracking
- Easy to add error recovery
- Testable

**Time Estimate:** 2 hours
- Create LoadingScene skeleton: 30min
- Move logic from loadLevel(): 1h
- Update GameScene.init(): 30min

**Confidence:** 90% - This is necessary for LoadingScene anyway

---

### Refactor 3: Fix Texture Verification ⭐ CRITICAL

**Current Problem:**
`loadAsset()` skips loading if `textures.exists()` returns true, but doesn't verify the texture is actually usable:

```typescript
export function loadAsset(scene: Phaser.Scene, key: AssetKey): void {
  if (scene.textures.exists(key)) {
    return;  // WRONG - texture might be broken
  }
  // ... load texture
}
```

**Why it's bad:**
- Texture might exist but be corrupted
- Texture might exist but not be in GPU memory (Android)
- Texture might exist but have zero dimensions
- No way to detect these failures

**Proposed Solution:**
Replace `exists()` check with proper verification:

```typescript
export function loadAsset(scene: Phaser.Scene, key: AssetKey): void {
  // Always verify, not just check existence
  if (TextureVerifier.verifyTexture(scene, key)) {
    return;  // Texture is verified usable
  }
  
  // Load if missing or broken
  // ... load texture
}
```

**Benefits:**
- Catches broken textures
- Catches GPU upload delays
- Prevents `__MISSING` sprites
- Works on all platforms

**Time Estimate:** 1 hour
- Create TextureVerifier: 30min
- Update loadAsset(): 15min
- Testing: 15min

**Confidence:** 95% - This is a known Android issue

---

### Refactor 4: Atomic Scene Transitions

**Current Problem:**
`transitionToLevel()` has no rollback on failure:

```typescript
private transitionToLevel(targetLevel: string, spawnCol: number, spawnRow: number): void {
  // Update world state
  worldState.setCurrentLevel(targetLevel);
  worldState.setPlayerSpawnPosition(spawnCol, spawnRow);
  
  // Fade out
  hudScene.tweens.add({
    onComplete: () => {
      void this.loadLevel(targetLevel, spawnCol, spawnRow).then(() => {
        // Fade in
      }).catch((error: unknown) => {
        console.error(`Failed to transition`);
        // NOW WHAT? We're stuck in broken state!
      });
    }
  });
}
```

**Why it's bad:**
- World state updated BEFORE load succeeds
- No way to return to previous level
- Catch block does nothing useful
- User stuck in broken state

**Proposed Solution:**
LoadingScene handles atomicity:

```typescript
// LoadingScene
async loadLevel(): Promise<void> {
  try {
    // Load everything
    const result = await AssetLoadCoordinator.loadLevelAssets(this, levelData);
    
    if (!result.success) {
      // Show error with options
      this.showError({
        message: `Failed to load: ${result.failed.join(', ')}`,
        options: [
          { text: 'Retry', action: () => this.loadLevel() },
          { text: 'Return', action: () => this.returnToPreviousLevel() }
        ]
      });
      return;
    }
    
    // Only update world state AFTER success
    worldState.setCurrentLevel(this.targetLevel);
    this.scene.start('GameScene', { ... });
    
  } catch (error) {
    this.showError({ ... });
  }
}
```

**Benefits:**
- Either fully succeeds or fully fails
- User can retry or return
- World state only updated on success
- Clear error messages

**Time Estimate:** 1.5 hours
- Error UI: 30min
- Retry logic: 30min
- Return to previous level: 30min

**Confidence:** 85% - Depends on world state management

---

### Refactor 5: Remove Duplicate Asset Tracking

**Current Problem:**
Asset usage is tracked in 3 places:
- `getBackgroundTextures()` - Extracts from level data
- `getRequiredAssetGroups()` - Extracts from entities
- Manual tracking in `loadLevel()` - Calculates deltas

This is error-prone and leads to missed assets.

**Code Smell:**
```typescript
// In loadLevel()
const prevLevelTextures = getBackgroundTextures(this.levelData);
const newLevelTextures = getBackgroundTextures(this.levelData);
const unusedTextures = [...new Set(prevLevelTextures.filter(...))];
const newTextures = [...new Set(newLevelTextures.filter(...))];
```

**Why it's bad:**
- Duplicate logic
- Easy to miss assets (e.g., NPC assets added later)
- No single source of truth
- Manual Set operations error-prone

**Proposed Solution:**
Create `AssetManifest` class:

```typescript
class AssetManifest {
  static fromLevelData(levelData: LevelData): Set<AssetKey> {
    const assets = new Set<AssetKey>();
    
    // Background textures
    this.addBackgroundTextures(assets, levelData);
    
    // Entity assets
    this.addEntityAssets(assets, levelData);
    
    // Animated textures
    this.addAnimatedTextures(assets, levelData);
    
    return assets;
  }
  
  static diff(prev: Set<AssetKey>, next: Set<AssetKey>): {
    toLoad: AssetKey[];
    toUnload: AssetKey[];
  } {
    return {
      toLoad: [...next].filter(k => !prev.has(k)),
      toUnload: [...prev].filter(k => !next.has(k))
    };
  }
}
```

**Benefits:**
- Single source of truth
- Easy to extend (add new asset types)
- Testable
- Clear API

**Time Estimate:** 1 hour
- Create AssetManifest: 30min
- Update callers: 30min

**Confidence:** 90% - Straightforward refactor

---

## Refactor Priority and Dependencies

### Phase 1: Foundation (5 hours)
1. **Refactor 3: Texture Verification** (1h) - No dependencies
2. **Refactor 5: Asset Manifest** (1h) - No dependencies
3. **Refactor 1: Asset Load Coordinator** (3h) - Depends on #1, #2

### Phase 2: Scene Restructure (3.5 hours)
4. **Refactor 2: Remove loadLevel()** (2h) - Depends on #3
5. **Refactor 4: Atomic Transitions** (1.5h) - Depends on #4

### Phase 3: LoadingScene Implementation (8-10 hours)
6. Implement LoadingScene with all refactors in place

**Total Time: 16.5-18.5 hours**

---

## Cost-Benefit Analysis

### Option A: Work Around Bad Code
**Approach:** Implement LoadingScene on top of existing code

**Pros:**
- Faster initial implementation (8-10 hours)

**Cons:**
- Still has race conditions
- Still has verification issues
- Still has scattered responsibilities
- LoadingScene becomes complex to work around issues
- Future features harder to add
- Technical debt compounds

**Total Cost:** 8-10 hours + ongoing maintenance burden

### Option B: Refactor First ⭐ RECOMMENDED
**Approach:** Fix foundation, then implement LoadingScene

**Pros:**
- Eliminates race conditions
- Proper verification
- Clear responsibilities
- LoadingScene becomes simple
- Future features easier
- Reduces technical debt

**Cons:**
- Higher upfront cost (16.5-18.5 hours)

**Total Cost:** 16.5-18.5 hours, but saves time long-term

---

## Recommendation

**Refactor first, then implement LoadingScene.**

**Reasoning:**
1. **Root cause fix** - Android failures are due to race conditions and lack of verification. Working around these issues makes LoadingScene complex and brittle.

2. **Simpler implementation** - With refactors, LoadingScene becomes a simple orchestrator instead of a complex workaround.

3. **Long-term savings** - Every future feature that touches asset loading benefits from clean architecture.

4. **Confidence** - 90%+ confidence that refactors will fix Android issues. Low confidence that workarounds will work reliably.

5. **User priority** - User explicitly wants robust, long-term solutions over quick hacks.

**Implementation Order:**
1. Week 1: Refactors 1-5 (8.5 hours)
2. Week 2: LoadingScene (8-10 hours)
3. Week 3: Testing and polish (4-6 hours)

**Total: 20.5-24.5 hours for complete, robust solution**

---

## Alternative Approaches (Not Recommended)

### Approach 1: Minimal LoadingScene
Just create LoadingScene without refactors, work around existing issues.

**Pros:** Fast (8-10 hours)
**Cons:** Doesn't fix root causes, still fails on Android
**Confidence:** 30% - Will likely still have issues

### Approach 2: Partial Refactor
Only do Refactor 1 (Asset Load Coordinator), skip others.

**Pros:** Moderate time (11-13 hours)
**Cons:** Still has scattered responsibilities, no atomicity
**Confidence:** 60% - Fixes race conditions but not other issues

### Approach 3: Full Rewrite
Throw away everything, start from scratch.

**Pros:** Clean slate
**Cons:** Very high risk, 40+ hours, might break existing features
**Confidence:** 50% - Too risky

---

## Conclusion

The existing level loading code is a textbook example of technical debt accumulation. Each feature was "tacked on" without considering architecture, leading to:

- Race conditions (multiple listeners)
- No verification (assumes 'complete' means usable)
- Scattered responsibilities (3+ files)
- No atomicity (partial failures)
- Platform-specific hacks (Android timing)

**Building LoadingScene on this foundation would be building on quicksand.**

The refactors are not optional - they fix the ROOT CAUSES of the Android failures. Working around them would make LoadingScene complex, brittle, and likely still broken on Android.

**Recommendation: Spend 8.5 hours on refactors, then 8-10 hours on LoadingScene. Total 16.5-18.5 hours for a robust, maintainable solution that actually works on all platforms.**

This aligns with the user's stated priority: robustness and long-term scalability over implementation time.
