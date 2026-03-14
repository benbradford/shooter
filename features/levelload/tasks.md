# Level Loading System - Task Breakdown (REDESIGNED)

## Phase 1: Core Implementation (~3 hours)

### Task 0.1: Create TextureVerifier
**File**: `src/systems/TextureVerifier.ts`

**Subtasks**:
- [x] Create `TextureVerifier` class with static methods
- [x] Implement `verifyTexture(scene, key)`:
  - [ ] Check `scene.textures.exists(key)` returns true
  - [ ] Check `scene.textures.get(key)` returns valid object
  - [ ] Check texture has frames (not empty)
  - [ ] Check first frame has valid source
  - [ ] Check source width/height > 0
  - [ ] Log specific failure reason for each check
  - [ ] Return boolean
- [x] Implement `verifyBatch(scene, keys)`:
  - [ ] Iterate keys, call verifyTexture for each
  - [ ] Return `{ valid: string[], invalid: string[] }`
- [x] Implement `waitForTextureReady(scene, key, timeoutMs)`:
  - [ ] Poll with 50ms intervals
  - [ ] Call verifyTexture each iteration
  - [ ] Return Promise<boolean>
  - [ ] Timeout after timeoutMs

**Dependencies**: None

**Estimated Time**: 1 hour
**Actual Time**: 15min

**Acceptance Criteria**:
- Returns false if any verification check fails
- Logs specific reason for failure
- waitForTextureReady polls correctly
- Works on all platforms

---

### Task 0.2: Create AssetManifest
**File**: `src/systems/AssetManifest.ts`

**Subtasks**:
- [x] Create `AssetManifest` class with static methods
- [x] Implement `fromLevelData(levelData)`:
  - [ ] Create empty Set<AssetKey>
  - [ ] Call `addBackgroundTextures(assets, levelData)`
  - [ ] Call `addEntityAssets(assets, levelData)`
  - [ ] Call `addAnimatedTextures(assets, levelData)`
  - [ ] Return Set
- [x] Implement `addBackgroundTextures(assets, levelData)`:
  - [ ] Extract background textures from cells
  - [ ] Add to assets Set
- [x] Implement `addEntityAssets(assets, levelData)`:
  - [ ] Extract entity types from entities array
  - [ ] Get required asset groups for each type
  - [ ] Add to assets Set
- [x] Implement `addAnimatedTextures(assets, levelData)`:
  - [ ] Extract animated textures from cells
  - [ ] Add to assets Set
- [x] Implement `diff(prev, next)`:
  - [ ] Calculate toLoad: keys in next but not prev
  - [ ] Calculate toUnload: keys in prev but not next
  - [ ] Return `{ toLoad, toUnload }`

**Dependencies**: None

**Estimated Time**: 1 hour
**Actual Time**: 10min

**Acceptance Criteria**:
- Single source of truth for asset tracking
- Handles all asset types (backgrounds, entities, animated)
- diff() correctly calculates deltas
- Easy to extend with new asset types

---

### Task 0.3: Create AssetLoadCoordinator
**File**: `src/systems/AssetLoadCoordinator.ts`

**Subtasks**:
- [x] Create `AssetLoadCoordinator` class
- [x] Implement `loadLevelAssets(scene, levelData, onProgress?)`:
  - [ ] Get required assets using AssetManifest.fromLevelData()
  - [ ] Queue all assets using existing AssetLoader functions
  - [ ] Register single 'complete' listener with timeout
  - [ ] Register 'progress' listener, call onProgress callback
  - [ ] Start load
  - [ ] Wait for completion or timeout
  - [ ] Verify all textures using TextureVerifier.verifyBatch()
  - [ ] Return `{ success: boolean, failedAssets: string[] }`
- [x] Implement `waitForLoad(scene, timeoutMs)`:
  - [ ] Return Promise that resolves on 'complete'
  - [ ] Reject on timeout (10 seconds)
  - [ ] Use single 'once' listener
- [x] Remove duplicate loading logic from AssetLoader.ts
- [x] Remove duplicate loading logic from GameScene.loadLevel()

**Dependencies**: Task 0.1, Task 0.2

**Estimated Time**: 3 hours
**Actual Time**: 15min

**Acceptance Criteria**:
- Single 'complete' listener (no race conditions)
- Verification built-in
- Progress tracking works
- Returns failure if any texture fails
- Timeout returns failure (not success)

---

### Task 0.4: Update AssetLoader.loadAsset()
**File**: `src/assets/AssetLoader.ts`

**Subtasks**:
- [x] Replace `scene.textures.exists(key)` check
- [x] Use `TextureVerifier.verifyTexture(scene, key)` instead
- [x] Only skip loading if texture is verified usable
- [x] Load if texture missing or broken

**Dependencies**: Task 0.1

**Estimated Time**: 15 minutes
**Actual Time**: 5min

**Acceptance Criteria**:
- Catches broken textures
- Catches GPU upload delays
- Prevents `__MISSING` sprites
- Works on all platforms

---

### Task 0.5: Create LoadingScene Skeleton
**File**: `src/scenes/LoadingScene.ts`

**Subtasks**:
- [x] Create scene class extending Phaser.Scene
- [x] Add constructor with key 'LoadingScene'
- [x] Implement `init(data)`:
  - [ ] Store targetLevel, targetCol, targetRow, previousLevel
  - [ ] Stop GameScene
  - [ ] Stop HudScene
- [x] Implement `create()`:
  - [ ] Show loading UI (progress bar, level name)
  - [ ] Call loadLevel() async
  - [ ] Catch errors, call showError()
- [x] Implement `loadLevel()` async:
  - [ ] Load level JSON using LevelLoader.load()
  - [ ] Call AssetLoadCoordinator.loadLevelAssets() with progress callback
  - [ ] If failure: call showError(), return
  - [ ] Call GameSceneRenderer.prepareRuntimeTilesets()
  - [ ] If failure: call showError(), return
  - [ ] Update world state (only on success)
  - [ ] Start GameScene with level data
  - [ ] Start HudScene
- [x] Implement `showError(message)`:
  - [ ] Clear loading UI
  - [ ] Show error message
  - [ ] Add retry button (calls loadLevel again)
  - [ ] Add return button (loads previousLevel)
- [x] Implement `updateProgress(percent)`:
  - [ ] Update progress bar visual

**Dependencies**: Task 0.3

**Estimated Time**: 2 hours
**Actual Time**: 20min

**Acceptance Criteria**:
- Stops other scenes before loading
- Shows progress 0-100%
- Atomic operation (all or nothing)
- Error UI with retry/return options
- Only updates world state on success

---

### Task 0.6: Remove GameScene.loadLevel()
**File**: `src/scenes/GameScene.ts`

**Subtasks**:
- [x] Delete `loadLevel()` method entirely (200 lines)
- [x] Delete `transitionToLevel()` method
- [x] Update `init(data)` signature:
  - [ ] Accept `{ level, levelData, playerCol, playerRow }`
  - [ ] Store level data
  - [ ] Store player spawn position
  - [ ] Remove all loading logic
- [x] Keep scene initialization logic in init()
- [x] Remove texture delta calculation
- [x] Remove manual asset unloading

**Dependencies**: Task 0.5

**Estimated Time**: 30 minutes
**Actual Time**: 15min

**Acceptance Criteria**:
- loadLevel() completely removed
- init() only handles initialization
- No loading logic in GameScene
- Build passes

---

### Task 0.7: Update LevelExitComponent
**File**: `src/ecs/components/level/LevelExitComponent.ts`

**Subtasks**:
- [x] Replace `scene.loadLevel()` call
- [x] Use `scene.scene.start('LoadingScene', data)` instead
- [x] Pass targetLevel, targetCol, targetRow
- [x] Pass previousLevel (scene.currentLevelName)

**Dependencies**: Task 0.5, Task 0.6

**Estimated Time**: 15 minutes
**Actual Time**: 5min

**Acceptance Criteria**:
- Triggers LoadingScene instead of loadLevel()
- Passes all required data
- Build passes

---

### Task 0.8: Register LoadingScene
**File**: `src/main.ts`

**Subtasks**:
- [x] Import LoadingScene
- [x] Add to scene array in game config

**Dependencies**: Task 0.5

**Estimated Time**: 5 minutes
**Actual Time**: 2min

**Acceptance Criteria**:
- LoadingScene registered
- Game starts without errors

---

### Task 0.9: Update GameSceneRenderer.prepareRuntimeTilesets()
**File**: `src/scenes/theme/GameSceneRenderer.ts`

**Subtasks**:
- [x] Change return type to `Promise<{ success: boolean; failed: string[] }>`
- [x] Before generating each tileset:
  - [ ] Verify source texture using TextureVerifier
  - [ ] If invalid, add to failed list, skip generation
- [x] After generating each tileset:
  - [ ] Verify generated texture using TextureVerifier
  - [ ] If invalid, add to failed list
- [x] Return success=true only if all tilesets generated and verified
- [x] Log specific failure reasons

**Dependencies**: Task 0.1

**Estimated Time**: 1 hour
**Actual Time**: 10min

**Acceptance Criteria**:
- Verifies source textures before generation
- Verifies generated textures after generation
- Returns list of failed tilesets
- Logs specific failure reasons

---

### Task 0.10: Test Refactors
**Test**: Manual testing

**Subtasks**:
- [ ] Test level transition on Mac
- [ ] Test level transition on Android
- [ ] Verify no `__MISSING` textures
- [ ] Verify single 'complete' listener (check logs)
- [ ] Verify texture verification catches broken textures
- [ ] Verify error UI shows on failure
- [ ] Verify retry button works
- [ ] Verify return to previous level works
- [ ] Test 5 consecutive transitions
- [ ] Verify build and lint pass

**Dependencies**: All Phase 0 tasks

**Estimated Time**: 1.5 hours

**Acceptance Criteria**:
- Works on Mac and Android
- No race conditions
- No `__MISSING` textures
- Error recovery works
- Build and lint pass

---

## Phase 1: Atomic Transitions (8-10 hours)

### Task 1.1: Create TextureVerifier
**File**: `src/systems/TextureVerifier.ts`

**Subtasks**:
- [ ] Create `verifyTexture(scene, key)` method
- [ ] Check texture exists
- [ ] Check texture.get() returns valid object
- [ ] Check texture has frames
- [ ] Check first frame has valid source
- [ ] Check source has dimensions > 0
- [ ] Log specific failure reason
- [ ] Create `verifyBatch(scene, keys)` method
- [ ] Create `waitForTextureReady(scene, key, timeoutMs)` method
- [ ] Poll with 50ms intervals for Android

**Dependencies**: None

**Estimated Time**: 1 hour

---

### Task 1.2: Update AssetLoader.loadLevelAssets()
**File**: `src/assets/AssetLoader.ts`

**Subtasks**:
- [ ] Change return type to `Promise<{ success: boolean; failedAssets: string[] }>`
- [ ] Add `onProgress` callback parameter
- [ ] Remove multiple 'complete' listeners
- [ ] Use single 'complete' listener with timeout
- [ ] After load complete, verify all textures
- [ ] Return failure if any texture fails verification
- [ ] Return success only if all textures verified
- [ ] Track progress with 'progress' event

**Dependencies**: Task 1.1

**Estimated Time**: 1.5 hours

---

### Task 1.3: Update GameSceneRenderer.prepareRuntimeTilesets()
**File**: `src/scenes/theme/GameSceneRenderer.ts`

**Subtasks**:
- [ ] Change return type to `Promise<{ success: boolean; failed: string[] }>`
- [ ] Verify source textures before generation
- [ ] Verify generated tilesets after generation
- [ ] Return list of failed tilesets
- [ ] Log specific failure reasons

**Dependencies**: Task 1.1

**Estimated Time**: 1 hour

---

### Task 1.4: Create LoadingScene
**File**: `src/scenes/LoadingScene.ts`

**Subtasks**:
- [ ] Create scene class extending Phaser.Scene
- [ ] Implement `init(data)` - stop GameScene/HudScene
- [ ] Implement `create()` - show loading UI
- [ ] Create loading UI (progress bar, level name)
- [ ] Implement `loadLevel()` async method
- [ ] Load level JSON
- [ ] Call AssetLoader.loadLevelAssets() with progress callback
- [ ] Call prepareRuntimeTilesets()
- [ ] On success: start GameScene with data
- [ ] On failure: call showError()
- [ ] Implement `showError(message)` - show error UI
- [ ] Add retry button
- [ ] Add return to previous level button
- [ ] Implement `updateProgress(percent)` - update progress bar

**Dependencies**: Task 1.2, Task 1.3

**Estimated Time**: 3 hours

---

### Task 1.5: Update LevelExitComponent
**File**: `src/ecs/components/level/LevelExitComponent.ts`

**Subtasks**:
- [ ] Replace `scene.loadLevel()` call with `scene.scene.start('LoadingScene', data)`
- [ ] Pass targetLevel, targetCol, targetRow, previousLevel

**Dependencies**: Task 1.4

**Estimated Time**: 15 minutes

---

### Task 1.6: Update GameScene.init()
**File**: `src/scenes/GameScene.ts`

**Subtasks**:
- [ ] Change init signature to accept `{ level, levelData, playerCol, playerRow }`
- [ ] Store level data
- [ ] Store player spawn position
- [ ] Remove loadLevel() method entirely

**Dependencies**: Task 1.4

**Estimated Time**: 30 minutes

---

### Task 1.7: Register LoadingScene
**File**: `src/main.ts`

**Subtasks**:
- [ ] Import LoadingScene
- [ ] Add to scene array

**Dependencies**: Task 1.4

**Estimated Time**: 5 minutes

---

### Task 1.8: Test Atomic Transitions
**Test**: Manual testing

**Subtasks**:
- [ ] Test successful level transition
- [ ] Test failed asset load (simulate 404)
- [ ] Test failed tileset generation
- [ ] Test retry button
- [ ] Test return to previous level button
- [ ] Verify no `__MISSING` textures
- [ ] Test on Mac
- [ ] Test on Android

**Dependencies**: All Phase 1 tasks

**Estimated Time**: 2 hours

---

## Phase 2: Memory Management (4-6 hours)

### Task 2.1: Create TextureReferenceTracker
**File**: `src/systems/TextureReferenceTracker.ts`

**Subtasks**:
- [ ] Create class with `references: Map<string, number>`
- [ ] Implement `addReference(key)`
- [ ] Implement `removeReference(key)` with warning if count = 0
- [ ] Implement `getRefCount(key)`
- [ ] Implement `getSafeToUnload()` - returns keys with count = 0

**Dependencies**: None

**Estimated Time**: 45 minutes

---

### Task 2.2: Add AssetManager.unloadSafe()
**File**: `src/systems/AssetManager.ts`

**Subtasks**:
- [ ] Add static `refTracker` field
- [ ] Implement `unloadSafe(scene, keys)` method
- [ ] Check ref count for each key
- [ ] Skip if ref count > 0
- [ ] Check canSafelyUnload() for each key
- [ ] Skip if dependencies exist
- [ ] Unload if safe
- [ ] Return `{ unloaded, skipped }` lists
- [ ] Log warnings for skipped textures

**Dependencies**: Task 2.1

**Estimated Time**: 1 hour

---

### Task 2.3: Add AssetManager.canSafelyUnload()
**File**: `src/systems/AssetManager.ts`

**Subtasks**:
- [ ] Implement `canSafelyUnload(scene, key)` method
- [ ] Get dependencies for key
- [ ] Check if animations still exist
- [ ] Check if tilesets still exist
- [ ] Return false if any dependencies exist
- [ ] Log specific blocking dependencies

**Dependencies**: Task 2.2

**Estimated Time**: 30 minutes

---

### Task 2.4: Create MemoryMonitor
**File**: `src/systems/MemoryMonitor.ts`

**Subtasks**:
- [ ] Create `checkForLeaks(scene)` static method
- [ ] Check for textures with refs but no sprites
- [ ] Check for animations referencing unloaded textures
- [ ] Check for tilesets referencing unloaded sources
- [ ] Return `{ leaked, warnings }` lists
- [ ] Implement `findSpritesUsingTexture()` helper

**Dependencies**: Task 2.2

**Estimated Time**: 1.5 hours

---

### Task 2.5: Integrate Reference Tracking
**Files**: Multiple

**Subtasks**:
- [ ] Update sprite creation to call `refTracker.addReference()`
- [ ] Update sprite destruction to call `refTracker.removeReference()`
- [ ] Update LoadingScene to use `unloadSafe()` instead of `unload()`
- [ ] Call `MemoryMonitor.checkForLeaks()` after level transition

**Dependencies**: Task 2.4

**Estimated Time**: 1.5 hours

---

### Task 2.6: Test Memory Management
**Test**: Manual testing

**Subtasks**:
- [ ] Test ref counting increments correctly
- [ ] Test ref counting decrements correctly
- [ ] Test unloadSafe skips textures in use
- [ ] Test unloadSafe skips textures with dependencies
- [ ] Test memory leak detection finds leaks
- [ ] Transition between levels 10 times
- [ ] Verify no memory leaks

**Dependencies**: Task 2.5

**Estimated Time**: 1.5 hours

---

## Phase 3: Testing (3-4 hours)

### Task 3.1: Create Test Levels
**Files**: `public/levels/test-loading-*.json`

**Subtasks**:
- [ ] Create test-loading-simple.json (few assets)
- [ ] Create test-loading-complex.json (many assets)
- [ ] Create test-loading-water.json (runtime tilesets)
- [ ] Create test-loading-shared.json (shared assets with another level)

**Dependencies**: None

**Estimated Time**: 1 hour

---

### Task 3.2: Create Automated Tests
**Files**: `test/tests/loading/*.js`

**Subtasks**:
- [ ] Create test-level-transition.js
- [ ] Create test-texture-verification.js
- [ ] Create test-error-recovery.js
- [ ] Create test-memory-management.js

**Dependencies**: Task 3.1

**Estimated Time**: 2 hours

---

### Task 3.3: Platform Testing
**Test**: Real device testing

**Subtasks**:
- [ ] Test on Mac (Chrome, Safari, Firefox)
- [ ] Test on Android device
- [ ] Test on iOS device (if available)
- [ ] Document any platform-specific issues
- [ ] Adjust waitForTextureReady() timing if needed

**Dependencies**: All previous tasks

**Estimated Time**: 1 hour

---

## Total Estimated Time

**Phase 0**: 8.5 hours (prerequisite refactors)
**Phase 1**: 8-10 hours (atomic transitions)
**Phase 2**: 4-6 hours (memory management)
**Phase 3**: 3-4 hours (testing)

**Total**: 23.5-28.5 hours

---

## Critical Path

**Phase 0 (Foundation):**
1. Task 0.1 (TextureVerifier) and 0.2 (AssetManifest) can run in parallel
2. Task 0.3 (AssetLoadCoordinator) depends on 0.1 and 0.2
3. Task 0.4 (Update loadAsset) depends on 0.1
4. Task 0.5 (LoadingScene skeleton) depends on 0.3
5. Task 0.6 (Remove loadLevel) depends on 0.5
6. Task 0.7 (Update LevelExitComponent) depends on 0.5 and 0.6
7. Task 0.8 (Register LoadingScene) depends on 0.5
8. Task 0.9 (Update prepareRuntimeTilesets) depends on 0.1
9. Task 0.10 (Test refactors) depends on all Phase 0 tasks

**Phase 1 (Atomic Transitions):**
1. Task 1.1 (TextureVerifier) must complete before 1.2, 1.3
2. Task 1.2, 1.3 must complete before 1.4 (LoadingScene)
3. Task 1.4 must complete before 1.5, 1.6, 1.7
4. Phase 1 must complete before Phase 2

**Phase 2 (Memory Management):**
1. Phase 2 must complete before Phase 3

**Overall:**
- Phase 0 must complete before Phase 1
- Phase 1 must complete before Phase 2
- Phase 2 must complete before Phase 3

---

## Risk Areas

- **Android GPU timing** - May need to adjust waitForTextureReady() polling interval
- **Phaser loader behavior** - Single 'complete' listener may behave differently than expected
- **Reference counting accuracy** - Must track all sprite creation/destruction
- **Memory leak detection** - May have false positives/negatives
- **Error recovery** - Returning to previous level may have edge cases

---

## Success Criteria

### Phase 0 (Prerequisite Refactors)
- [ ] TextureVerifier catches broken textures
- [ ] AssetManifest provides single source of truth
- [ ] AssetLoadCoordinator uses single 'complete' listener
- [ ] No race conditions on Android
- [ ] LoadingScene skeleton shows progress
- [ ] GameScene.loadLevel() completely removed
- [ ] LevelExitComponent triggers LoadingScene
- [ ] prepareRuntimeTilesets() verifies textures
- [ ] Build and lint pass

### Phase 1 (Atomic Transitions)
- [ ] Level transitions work on Mac and Android
- [ ] No `__MISSING` textures
- [ ] All textures verified before use
- [ ] Failed loads show error UI
- [ ] Can retry or return to previous level
- [ ] No partial state on failure

### Phase 2 (Memory Management)
- [ ] Reference counting tracks all texture usage
- [ ] Only unloads textures with refCount = 0
- [ ] Dependencies checked before unload
- [ ] Memory leak detection runs on transition
- [ ] Warnings logged for potential leaks

### Phase 3 (Testing)
- [ ] All automated tests pass
- [ ] Works on Mac, Android, iOS
- [ ] No memory leaks after 10 transitions
- [ ] Build and lint pass
