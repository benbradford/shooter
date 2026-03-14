# Level Loading Fix - Complete

## Summary

Level transitions now work correctly throughout the game. All loading tests pass.

## Bugs Fixed

### 1. Runtime Textures Being Unloaded
**Problem:** UUID-named textures (water animations, tilesets) were being unloaded while sprites still used them
**Fix:** Filter out runtime textures from unload candidates using UUID pattern and special name patterns

### 2. Vignette Texture Key Mismatch
**Problem:** Asset registry used key 'vignette' but renderers used 'vin'
**Fix:** Changed all renderers to use 'vignette'

### 3. WorldState Reset on Scene Restart
**Problem:** `loadFromFile()` was called on every scene restart, overwriting transition target
**Fix:** Only load from file once using static flag `hasLoadedWorldState`

### 4. URL Parameter Override
**Problem:** URL parameter was used on every scene restart, ignoring transitions
**Fix:** Only use URL parameter on first load using static flag `hasLoadedFromURL`, then sync worldState

### 5. Asset Group Mismatch
**Problem:** `stalking_robot` entity type used `floating_robot` texture but asset group only had 'attacker'
**Fix:** Updated `stalking_robot` asset group to include floating_robot assets

## Changes Made

### src/scenes/GameScene.ts
- Added `children.removeAll(true)` at start of create() to clean up leftover sprites
- Added static flags: `hasLoadedWorldState`, `hasLoadedFromURL`
- Only load worldState from file once (first create())
- Only use URL parameter once (first create()), then sync worldState
- On subsequent creates, use worldState.getCurrentLevelName()

### src/scenes/LoadingScene.ts
- Added runtime texture filtering in `unloadPreviousLevelAssets()`
- Filters out UUID-named textures (water animations, generated tilesets)
- Filters out textures with '_gradient', '_tileset', '_water_' in name

### src/scenes/theme/*.ts (4 files)
- Changed vignette texture key from 'vin' to 'vignette'
- Files: DungeonSceneRenderer, GrassSceneRenderer, SwampSceneRenderer, WildsSceneRenderer

### src/assets/AssetRegistry.ts
- Updated `stalking_robot` asset group to include floating_robot assets

### src/debug/PhaserDebug.ts (new file)
- Debug utilities for tracing Phaser lifecycle issues
- Can be removed if not needed, but useful for future debugging

## Test Results

All loading tests pass:
- ✅ test-level-transition (5 tests)
- ✅ test-memory-management (2 tests)
- ✅ test-texture-verification (3 tests)
- ✅ test-comprehensive-transitions (5 consecutive transitions)
- ✅ test-real-transitions (3 transitions between real game levels)

## Key Insights

1. **Phaser scene.start() reuses the same instance** - Old display objects remain unless explicitly removed
2. **Runtime textures need special handling** - Can't be unloaded like regular assets
3. **WorldState must persist across scene restarts** - Only load from file once
4. **URL parameters only apply to first load** - Transitions use worldState
5. **Asset groups must match entity texture usage** - Mismatch causes __MISSING textures

## What Was NOT Needed

ChatGPT's recommendations that turned out to be unnecessary:
- ❌ Reference counting - Current system works fine
- ❌ 3-tier asset system - Current filtering is sufficient
- ❌ TransitionController - Current flow works
- ❌ Waiting for shutdown event - Timing is already correct
- ❌ Animation cleanup - No animations reference level textures

The actual bugs were simpler:
- Runtime texture filtering
- Texture key mismatch
- WorldState reset
- URL parameter override
- Asset group mismatch

## Verification

Run all loading tests:
```bash
npm run test:single test-level-transition
npm run test:single test-memory-management
npm run test:single test-comprehensive-transitions
npm run test:single test-real-transitions
```

All should pass with no errors.
