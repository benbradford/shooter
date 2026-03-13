# Level Loading System - Requirements

## Overview

A robust, atomic level loading system that works reliably across all platforms (Mac, Android, iOS, web) with proper memory management and error handling.

## Current Problems

1. **Platform inconsistency** - Works on Mac, fails on Android with `__MISSING` textures
2. **Race conditions** - Multiple 'complete' listeners, timing dependencies
3. **No verification** - Assumes textures are usable after 'complete' event
4. **Brittle unloading** - Unloads before verifying new textures are ready
5. **No rollback** - Partial failures leave game in broken state
6. **Timeout proceeds anyway** - Gives up and continues with broken state
7. **Scattered responsibilities** - Loading logic in AssetLoader, GameScene, GameSceneRenderer
8. **No single source of truth** - Asset tracking duplicated in multiple places

## Phase 0: Prerequisite Refactors

**Purpose**: Fix root architectural problems before implementing LoadingScene. These refactors eliminate race conditions, centralize responsibilities, and enable atomic transitions.

### 0.1 TextureVerifier

**Purpose**: Verify textures are actually usable, not just "loaded"

**API**:
```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean
  static verifyBatch(scene: Phaser.Scene, keys: string[]): { valid: string[]; invalid: string[] }
  static waitForTextureReady(scene: Phaser.Scene, key: string, timeoutMs: number): Promise<boolean>
}
```

**Verification Steps**:
1. `scene.textures.exists(key)` returns true
2. `scene.textures.get(key)` returns valid texture object
3. Texture has frames (not empty)
4. First frame has valid source image
5. Source image width/height > 0

**Acceptance Criteria**:
- Returns false if any check fails
- Logs specific failure reason
- Works on all platforms (Mac, Android, iOS, web)
- Handles edge cases (partially loaded, corrupted, GPU upload delay)
- waitForTextureReady() polls with 50ms intervals for Android

---

### 0.2 AssetManifest

**Purpose**: Single source of truth for asset tracking

**API**:
```typescript
class AssetManifest {
  static fromLevelData(levelData: LevelData): Set<AssetKey>
  static diff(prev: Set<AssetKey>, next: Set<AssetKey>): { toLoad: AssetKey[]; toUnload: AssetKey[] }
}
```

**Behavior**:
- Extracts all required assets from level data
- Includes background textures, entity assets, animated textures
- Calculates deltas between levels
- Easy to extend with new asset types

**Acceptance Criteria**:
- Single source of truth (no duplicate tracking)
- Handles all asset types
- diff() correctly calculates toLoad and toUnload
- Easy to extend

---

### 0.3 AssetLoadCoordinator

**Purpose**: Centralize all asset loading with single 'complete' listener

**API**:
```typescript
class AssetLoadCoordinator {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; failedAssets: string[] }>
}
```

**Behavior**:
1. Get required assets using AssetManifest
2. Queue all assets
3. Register single 'complete' listener with timeout
4. Register 'progress' listener
5. Start load
6. Wait for completion or timeout
7. Verify all textures using TextureVerifier
8. Return success/failure with failed asset list

**Acceptance Criteria**:
- Single 'complete' listener (eliminates race conditions)
- Verification built-in
- Progress tracking (0-100%)
- Returns failure if any texture fails
- Timeout returns failure (not success)
- Replaces duplicate loading logic in AssetLoader and GameScene

---

### 0.4 LoadingScene Skeleton

**Purpose**: Dedicated scene for level transitions (replaces GameScene.loadLevel())

**API**:
```typescript
class LoadingScene extends Phaser.Scene {
  init(data: { targetLevel: string; targetCol: number; targetRow: number; previousLevel: string }): void
  create(): void
  private async loadLevel(): Promise<void>
  private showError(message: string): void
}
```

**Behavior**:
- Stops GameScene and HudScene
- Shows loading UI (progress bar, level name)
- Calls AssetLoadCoordinator.loadLevelAssets()
- Calls GameSceneRenderer.prepareRuntimeTilesets()
- On success: Starts GameScene with level data
- On failure: Shows error with retry/return options

**Acceptance Criteria**:
- Atomic operation (all or nothing)
- Only updates world state on success
- Error UI with retry/return buttons
- Never proceeds with broken state

---

### 0.5 Remove GameScene.loadLevel()

**Purpose**: Delete 200-line monster method, move logic to LoadingScene

**Changes**:
- Delete loadLevel() entirely
- Delete transitionToLevel()
- Update init() to accept level data from LoadingScene
- Remove all loading logic from GameScene

**Acceptance Criteria**:
- GameScene only handles initialization
- No loading logic in GameScene
- Build passes

---

### 0.6 Update AssetLoader.loadAsset()

**Purpose**: Use verification instead of exists() check

**Changes**:
```typescript
// Before:
if (scene.textures.exists(key)) return;

// After:
if (TextureVerifier.verifyTexture(scene, key)) return;
```

**Acceptance Criteria**:
- Catches broken textures
- Catches GPU upload delays
- Prevents `__MISSING` sprites

---

## Phase 1: Atomic Transitions

### 1.1 LoadingScene

**Purpose**: Dedicated scene for level transitions with progress tracking

**API**:
```typescript
class LoadingScene extends Phaser.Scene {
  constructor()
  
  init(data: {
    targetLevel: string;
    targetCol: number;
    targetRow: number;
    previousLevel: string;
  }): void
  
  create(): void
  private async loadLevel(): Promise<void>
  private showError(message: string): void
}
```

**Behavior**:
- Stops GameScene and HudScene
- Shows loading UI (progress bar, level name)
- Loads all assets with progress tracking
- Verifies textures are usable
- On success: Starts GameScene with new level
- On failure: Shows error, allows retry or return to previous level

**Acceptance Criteria**:
- Stops all other scenes before loading
- Shows progress percentage (0-100%)
- Verifies every texture before proceeding
- Never proceeds with broken state
- Provides retry mechanism on failure
- Can return to previous level on failure

---

### 1.2 Texture Verification System

**Purpose**: Verify textures are actually usable, not just "loaded"

**API**:
```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean
  static verifyBatch(scene: Phaser.Scene, keys: string[]): { valid: string[]; invalid: string[] }
  static waitForTextureReady(scene: Phaser.Scene, key: string, timeoutMs: number): Promise<boolean>
}
```

**Verification Checks**:
1. `scene.textures.exists(key)` returns true
2. `scene.textures.get(key)` returns valid texture object
3. Texture has frames (not empty)
4. First frame has valid source image
5. Source image width/height > 0

**Acceptance Criteria**:
- Returns false if any check fails
- Logs specific failure reason
- Works on all platforms
- Handles edge cases (partially loaded, corrupted)

---

### 1.3 Asset Loading with Verification

**Purpose**: Load assets and verify they're usable before proceeding

**API**:
```typescript
class AssetLoader {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; failedAssets: string[] }>
}
```

**Behavior**:
1. Calculate required assets from level data
2. Queue all assets for loading
3. Start load with progress tracking
4. Wait for 'complete' event (single listener)
5. Verify each texture is usable
6. If any fail, return failure with list
7. If all pass, return success

**Acceptance Criteria**:
- Single 'complete' listener
- Progress callback fires 0-100%
- Verifies every texture
- Returns list of failed assets
- Never proceeds with unverified textures
- Timeout returns failure (not success)

---

### 1.4 Runtime Tileset Generation with Verification

**Purpose**: Generate tilesets only after source textures are verified

**API**:
```typescript
class GameSceneRenderer {
  async prepareRuntimeTilesets(levelData: LevelData): Promise<{ success: boolean; failed: string[] }>
}
```

**Behavior**:
1. Verify source textures exist and are usable
2. Generate each tileset
3. Verify generated tileset is usable
4. If any fail, return failure with list
5. If all pass, return success

**Acceptance Criteria**:
- Only generates if source texture verified
- Verifies generated texture
- Returns list of failed tilesets
- Logs specific failure reasons

---

### 1.5 Atomic Level Transition

**Purpose**: Either fully succeed or fully fail (no partial state)

**Flow**:
```
1. Stop GameScene and HudScene
2. Show LoadingScene
3. Load all assets with verification
4. Generate runtime tilesets with verification
5. If any step fails:
   - Show error message
   - Offer retry or return to previous level
6. If all succeed:
   - Unload old assets
   - Initialize new level
   - Start GameScene and HudScene
```

**Acceptance Criteria**:
- All steps complete or none do
- No partial state (half-loaded level)
- Can retry failed load
- Can return to previous level
- Previous level state preserved until success

---

### 1.6 Error Handling and Recovery

**Purpose**: Handle failures gracefully with user options

**Error Types**:
- Asset load timeout (>10 seconds)
- Texture verification failure
- Tileset generation failure
- Scene initialization failure

**Recovery Options**:
- Retry load (same level)
- Return to previous level
- Return to main menu (future)

**Acceptance Criteria**:
- Clear error messages
- User can choose recovery action
- Retry attempts fresh load
- Return to previous level works
- No crashes on error

---

## Phase 2: Memory Management

### 2.1 Reference Counting System

**Purpose**: Track which textures are in use, safe to unload

**API**:
```typescript
class TextureReferenceTracker {
  private references: Map<string, number>
  
  addReference(key: string): void
  removeReference(key: string): void
  getRefCount(key: string): number
  getSafeToUnload(): string[]
}
```

**Behavior**:
- Increment ref count when texture used
- Decrement ref count when no longer used
- Texture safe to unload when ref count = 0
- Never unload texture with ref count > 0

**Acceptance Criteria**:
- Accurate ref counting
- Thread-safe (no race conditions)
- Handles edge cases (double add, double remove)
- Logs warnings for unexpected operations

---

### 2.2 Safe Texture Unloading

**Purpose**: Only unload textures that are safe to unload

**API**:
```typescript
class AssetManager {
  unloadSafe(scene: Phaser.Scene, keys: string[]): { unloaded: string[]; skipped: string[] }
}
```

**Behavior**:
1. Check ref count for each texture
2. Only unload if ref count = 0
3. Skip if ref count > 0
4. Log skipped textures
5. Return lists of unloaded and skipped

**Acceptance Criteria**:
- Never unloads texture in use
- Logs skipped textures
- Returns accurate lists
- No errors on unload

---

### 2.3 Dependency Tracking

**Purpose**: Track dependencies (animations, tilesets) and clean up safely

**Current System**: AssetManager already tracks dependencies

**Enhancement**: Verify dependencies are cleaned up before unloading parent

**API**:
```typescript
class AssetManager {
  canSafelyUnload(scene: Phaser.Scene, key: string): boolean
}
```

**Behavior**:
1. Check if texture has dependencies
2. Check if dependencies are cleaned up
3. Return true only if safe
4. Log reason if not safe

**Acceptance Criteria**:
- Checks all dependencies
- Returns false if dependencies exist
- Logs specific blocking dependencies
- Works with existing dependency system

---

### 2.4 Memory Leak Detection

**Purpose**: Detect and warn about potential memory leaks

**API**:
```typescript
class MemoryMonitor {
  static checkForLeaks(scene: Phaser.Scene): { leaked: string[]; warnings: string[] }
}
```

**Checks**:
- Textures with ref count > 0 but no sprites using them
- Animations referencing unloaded textures
- Tilesets referencing unloaded source textures
- Sprites referencing destroyed entities

**Acceptance Criteria**:
- Detects common leak patterns
- Logs warnings with details
- Runs on level transition
- Helps debug memory issues

---

## File Structure

### Files to Create

**Core System**:
- `src/scenes/LoadingScene.ts` - Dedicated loading scene
- `src/systems/TextureVerifier.ts` - Texture verification
- `src/systems/TextureReferenceTracker.ts` - Reference counting
- `src/systems/MemoryMonitor.ts` - Leak detection

**Tests**:
- `test/tests/loading/test-level-transition.js` - Basic transition
- `test/tests/loading/test-texture-verification.js` - Verification
- `test/tests/loading/test-error-recovery.js` - Error handling
- `test/tests/loading/test-memory-management.js` - Ref counting

### Files to Modify

**Asset Loading**:
- `src/assets/AssetLoader.ts` - Use verification, single listener
- `src/systems/AssetManager.ts` - Add canSafelyUnload()

**Scene Management**:
- `src/scenes/GameScene.ts` - Remove loadLevel(), use LoadingScene
- `src/ecs/components/level/LevelExitComponent.ts` - Transition to LoadingScene
- `src/main.ts` - Register LoadingScene

**Rendering**:
- `src/scenes/theme/GameSceneRenderer.ts` - Return success/failure from prepareRuntimeTilesets()

---

## Success Criteria

### Phase 1: Atomic Transitions
- ✅ Level transitions work on Mac and Android
- ✅ No `__MISSING` textures
- ✅ All textures verified before use
- ✅ Failed loads show error, don't proceed
- ✅ Can retry or return to previous level
- ✅ No partial state on failure

### Phase 2: Memory Management
- ✅ Textures only unloaded when safe
- ✅ No memory leaks
- ✅ Dependencies cleaned up correctly
- ✅ Ref counting accurate
- ✅ Warnings for potential leaks

### Overall
- ✅ Build and lint pass
- ✅ All tests pass
- ✅ Works on Mac, Android, iOS, web
- ✅ No race conditions
- ✅ Clear error messages
- ✅ Maintainable code
