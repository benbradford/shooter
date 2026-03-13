# Level Loading System Redesign

## Problem Statement

The current level loading and transition system has a critical bug on Android where textures fail to load during level transitions, showing as `__MISSING` sprites. The system works perfectly on Mac but fails consistently on Android.

The real problem is the way this game has been develpoed with AI. AI is no good at designing good robust systems from the ground up, it is very good at taking what is there and tacking in new features. I am trying to break this cycle here. I want a complete introspection of level loading, find everything wrong with it and design a whole new way of loading levels. don't be scared to rip up what we have and completely redo it. there are too many things wrong right now and it is too hard to build anything else in this game because we have brittle feature hacked on top of brittle feature and we are clearly at a breaking point where kiro is unable to diagnose issues.

**Symptoms:**
- Initial level load: Works on both Mac and Android
- Level transitions: Works on Mac, fails on Android
- Textures show as `__MISSING` even though logs indicate they loaded
- The `[AssetLoader] Loaded X textures` log fires, but textures are not usable

## Current System Analysis

### Flow Overview

1. **Trigger fires** → Player enters exit cell
2. **LevelExitComponent** calls `GameScene.loadLevel(targetLevel, targetCol, targetRow)`
3. **Pause scene** → `this.scene.pause()`
4. **Calculate texture deltas** → Determine which textures to unload/load
5. **Destroy game objects** → Clear all sprites, entities, graphics
6. **Queue asset loading** → Call `preloadAssetGroups()` and `loadAsset()` for each texture
7. **Start loading** → `this.load.start()`
8. **Wait for complete** → Register `once('complete')` listener with timeout fallback
9. **Unload old textures** → `AssetManager.unloadBatch(unusedTextures)`
10. **Generate runtime tilesets** → `sceneRenderer.loadAllAssets()` creates water/path tilesets
11. **Render theme** → Create background gradient and vignette
12. **Reset scene** → Destroy entities, recreate grid, spawn new entities
13. **Initialize sprites** → `sceneRenderer.initializeSprites()` creates all sprites from textures
14. **Resume scene** → `this.scene.resume()`

### Critical Brittle Points

#### 1. Multiple 'complete' Event Listeners
**Location:** `AssetLoader.preloadLevelAssets()` and `GameScene.loadLevel()`

**Problem:** Both register `once('complete')` listeners on the same loader. On Android, only one fires or they fire in wrong order. (human - THIS IS A GUESS - Kiro keeps guessing, take this with a pinch of salt)

**Code:**
```typescript
// In preloadLevelAssets()
scene.load.once('complete', () => {
  console.log('[AssetLoader] Loaded X textures');
  if (onComplete) onComplete();
});

// In loadLevel()
this.load.once('complete', () => {
  resolve();
});
```

**Why brittle:** Relies on Phaser's event system behaving identically across platforms. No guarantee both listeners fire.

#### 2. Texture Existence Check Doesn't Verify Usability
**Location:** `AssetLoader.loadAsset()`

**Problem:** Skips loading if `textures.exists(key)` returns true, but doesn't verify the texture is actually usable.

**Code:**
```typescript
function loadAsset(scene: Phaser.Scene, key: AssetKey): void {
  if (scene.textures.exists(key)) {
    return;  // Skip if "exists"
  }
  scene.load.image(key, path);
}
```

**Why brittle:** A texture might "exist" but be in a broken state (partially unloaded, corrupted, not in GPU memory). We skip loading it, then it's not usable.

**Scenario:**
1. Level 1 loads `grass1` texture
2. Transition to Level 2 (doesn't use `grass1`)
3. We unload `grass1` but it still "exists" in some state
4. Transition back to Level 1
5. `loadAsset()` sees `grass1` exists, skips loading
6. Try to use `grass1` → `__MISSING`

#### 3. Unloading Textures Before Sprites Are Created
**Location:** `GameScene.loadLevel()` - unload happens before `initializeSprites()`

**Problem:** We unload old textures, then try to create sprites from new textures. On Android, timing issues cause new textures to not be ready.

**Code:**
```typescript
await new Promise<void>(resolve => {
  this.load.once('complete', () => resolve());
});

// Unload old textures immediately
assetManager.unloadBatch(this, unusedTextures);

// Later...
this.sceneRenderer.initializeSprites(this.grid, this.levelData);
```

**Why brittle:**
- Unload might interfere with newly loaded textures
- No verification that new textures are actually ready
- Assumes 'complete' event means textures are usable

#### 4. Runtime Tileset Generation Without Source Verification
**Location:** `GameSceneRenderer.prepareRuntimeTilesets()`

**Problem:** Tries to generate tilesets from source textures immediately after 'complete' event. Doesn't verify source textures are ready.

**Code:**
```typescript
await this.sceneRenderer.loadAllAssets(this.levelData);
// Calls prepareRuntimeTilesets() which:
const generator = new PathTilesetGenerator(this.scene);
const success = generator.generateTileset(sourceTexture, outputKey);
// Returns false if source texture doesn't exist, but no retry or error handling
```

**Why brittle:**
- Source texture might not be in GPU memory yet
- Generation fails silently (just returns false)
- No retry mechanism
- Generated texture might not be ready when `initializeSprites()` runs

#### 5. Scene Pause Doesn't Stop Updates
**Location:** `GameScene.update()` and `HudScene.update()`

**Problem:** Calling `scene.pause()` doesn't prevent `update()` from being called. Entities get destroyed but HudScene still tries to access them.

**Code:**
```typescript
this.scene.pause();  // Doesn't actually stop update()

// Later in update():
update(delta: number): void {
  this.entityManager.update(delta);  // Still runs!
  // Tries to access destroyed entities → null reference errors
}
```

**Why brittle:** Misunderstanding of Phaser's pause mechanism. Pause stops time/physics but not the update loop.

#### 6. No Verification That Textures Are Usable
**Location:** Throughout `loadLevel()`

**Problem:** We wait for 'complete' event and assume textures are ready. No verification step.

**Code:**
```typescript
await new Promise<void>(resolve => {
  this.load.once('complete', () => resolve());
});
// Immediately proceed to use textures
```

**Why brittle:**
- 'complete' event might fire before textures are in GPU memory
- No check that `scene.textures.get(key)` returns a valid texture
- No check that texture has actual image data
- Platform differences in when textures become usable

#### 7. Async Operations Without Clear Dependencies
**Location:** `loadLevel()` has multiple async operations

**Problem:** Multiple async operations (load assets, generate tilesets, reset scene) without explicit dependency management.

**Code:**
```typescript
await loadAssets();
await generateTilesets();  // Depends on loadAssets
await resetScene();  // Independent
initializeSprites();  // Depends on generateTilesets AND resetScene
```

**Why brittle:**
- Dependencies not explicit in code
- Easy to reorder incorrectly
- Race conditions if operations overlap
- Platform timing differences expose bugs

#### 8. Texture Key Collisions Not Handled
**Location:** Texture delta calculation

**Problem:** Assumes texture keys are unique per level. What if two levels use the same texture key for different images?

**Code:**
```typescript
const unusedTextures = prevLevelTextures.filter(tex => !newLevelTextures.includes(tex));
```

**Why brittle:** String comparison assumes keys are unique. If Level 1 and Level 2 both have `door` but different images, we won't reload it.

#### 9. No Rollback on Failure
**Location:** Entire `loadLevel()` method

**Problem:** If loading fails halfway through, we're stuck in a broken state. Can't return to previous level.

**Why brittle:** No transaction-like behavior. No way to recover from partial failure.

#### 10. Timeout Fallback Proceeds Anyway
**Location:** `loadLevel()` timeout

**Problem:** If assets don't load in 10 seconds, we timeout and proceed anyway. This guarantees `__MISSING` sprites.

**Code:**
```typescript
setTimeout(() => {
  resolve();  // Give up and proceed
}, 10000);
```

**Why brittle:** Timeout is a band-aid, not a solution. We proceed with broken state instead of handling the failure.

## Why create() Works But loadLevel() Doesn't

**create():**
- Scene is fresh, no existing state
- No textures to unload
- No sprites to destroy
- Assets loaded in `preload()` before `create()` runs (Phaser's built-in mechanism)
- Single 'complete' listener
- No runtime tileset generation during load
- No complex async sequencing

**loadLevel():**
- Scene is running, has existing state
- Must unload old textures
- Must destroy old sprites
- Assets loaded during transition (custom mechanism)
- Multiple 'complete' listeners
- Runtime tileset generation during load
- Complex async sequencing with race conditions

## Design Requirements

### Must Have
1. **Reliable asset loading** - Textures must be verified as usable before proceeding
2. **Platform consistency** - Identical behavior on Mac, Android, iOS, web
3. **Atomic transitions** - Either fully succeed or fully fail (no partial state)
4. **Clear error handling** - Know when/why loading fails, can retry or recover
5. **No race conditions** - Explicit sequencing, no timing dependencies
6. **Defensive checks** - Verify every assumption (texture exists, texture usable, sprites created)
7. **Simple async flow** - Easy to reason about, no complex Promise.race() or multiple listeners

### Should Have
8. **Memory efficiency** - Unload unused assets without breaking anything
9. **Fast transitions** - Minimize loading time
10. **Loading screen** - Show progress during long loads
11. **Preloading** - Load next level in background while playing current level

### Nice to Have
12. **Asset caching** - Keep frequently used assets in memory
13. **Retry logic** - Automatically retry failed loads
14. **Fallback assets** - Use placeholder textures if load fails

## Questions for Design

1. Should we use Phaser's built-in scene transition system instead of custom loading?
2. Should we load ALL assets upfront and never unload (simpler but uses more memory)?
3. Should we use a loading scene that shows progress?
4. How do we verify a texture is actually usable (not just "exists")?
5. Should we generate runtime tilesets upfront or on-demand?
6. How do we handle the case where Android takes 10+ seconds to load?
7. Should we keep old level in memory until new level is fully loaded?
8. How do we prevent HudScene from accessing destroyed entities?
9. Should we use a state machine for loading states (LOADING, LOADED, FAILED)?
10. How do we make the async flow simple and predictable?

## Success Criteria

- Level transitions work reliably on Mac, Android, iOS, web
- No `__MISSING` sprites ever
- Clear error messages if loading fails
- Can retry failed loads
- Loading time < 2 seconds on all platforms
- Memory usage reasonable (don't keep all assets in memory)
- Code is simple and easy to understand
- No race conditions or timing dependencies

## Request

Please design a robust level loading system that addresses all these problems. Ask clarifying questions as needed. Create a complete design before any implementation.
