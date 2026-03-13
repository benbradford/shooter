# Level Loading System - Implementation Clarifications

## Critical Design Decisions (Finalized)

### 1. Single 'complete' Listener ✓
- **What**: Only one 'complete' listener per load operation
- **Why**: Multiple listeners cause race conditions on Android
- **How**: Use Promise with single `scene.load.once('complete', resolve)`

### 2. Texture Verification Required ✓
- **What**: Verify every texture after 'complete' event
- **Why**: 'complete' doesn't guarantee texture is usable on Android
- **How**: 5-step verification (exists, get, frames, source, dimensions)

### 3. Atomic Transitions ✓
- **What**: Either fully succeed or fully fail (no partial state)
- **Why**: Prevents broken game state
- **How**: LoadingScene handles all loading, only starts GameScene on success

### 4. Error Recovery UI ✓
- **What**: Show error message with retry/return buttons
- **Why**: User can recover from failures
- **How**: Clear loading UI, show error text and buttons

### 5. Reference Counting for Unloading ✓
- **What**: Track texture usage count, only unload when count = 0
- **Why**: Prevents unloading textures still in use
- **How**: TextureReferenceTracker with Map<string, number>

### 6. Dependency Checking ✓
- **What**: Check animations/tilesets before unloading parent texture
- **Why**: Prevents errors from stale references
- **How**: AssetManager.canSafelyUnload() checks dependencies

### 7. Android GPU Upload Delay ✓
- **What**: Poll with 50ms intervals to wait for GPU upload
- **Why**: Android textures may not be in GPU memory immediately
- **How**: waitForTextureReady() polls until verification passes

### 8. Memory Leak Detection ✓
- **What**: Check for textures with refs but no sprites
- **Why**: Helps debug memory issues
- **How**: MemoryMonitor.checkForLeaks() after transitions

### 9. Progress Tracking ✓
- **What**: Show 0-100% progress during asset loading
- **Why**: User feedback for long loads
- **How**: Phaser's 'progress' event with callback

### 10. Return to Previous Level ✓
- **What**: Button to go back to previous level on error
- **Why**: User can escape broken state
- **How**: LoadingScene receives previousLevel, can transition back

---

## API Summary

### TextureVerifier
```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean
  static verifyBatch(scene: Phaser.Scene, keys: string[]): { valid: string[]; invalid: string[] }
  static waitForTextureReady(scene: Phaser.Scene, key: string, timeoutMs: number): Promise<boolean>
}
```

### AssetLoader
```typescript
class AssetLoader {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; failedAssets: string[] }>
}
```

### GameSceneRenderer
```typescript
class GameSceneRenderer {
  async prepareRuntimeTilesets(levelData: LevelData): Promise<{ success: boolean; failed: string[] }>
}
```

### LoadingScene
```typescript
class LoadingScene extends Phaser.Scene {
  init(data: { targetLevel: string; targetCol: number; targetRow: number; previousLevel: string }): void
  create(): void
  private async loadLevel(): Promise<void>
  private showError(message: string): void
}
```

### TextureReferenceTracker
```typescript
class TextureReferenceTracker {
  addReference(key: string): void
  removeReference(key: string): void
  getRefCount(key: string): number
  getSafeToUnload(): string[]
}
```

### AssetManager
```typescript
class AssetManager {
  unloadSafe(scene: Phaser.Scene, keys: string[]): { unloaded: string[]; skipped: string[] }
  canSafelyUnload(scene: Phaser.Scene, key: string): boolean
}
```

### MemoryMonitor
```typescript
class MemoryMonitor {
  static checkForLeaks(scene: Phaser.Scene): { leaked: string[]; warnings: string[] }
}
```

---

## Implementation Order

### Phase 1: Atomic Transitions (8-10 hours)
1. TextureVerifier (1h)
2. Update AssetLoader (1.5h)
3. Update GameSceneRenderer (1h)
4. Create LoadingScene (3h)
5. Update LevelExitComponent (15min)
6. Update GameScene.init() (30min)
7. Register LoadingScene (5min)
8. Test (2h)

### Phase 2: Memory Management (4-6 hours)
1. TextureReferenceTracker (45min)
2. AssetManager.unloadSafe() (1h)
3. AssetManager.canSafelyUnload() (30min)
4. MemoryMonitor (1.5h)
5. Integrate reference tracking (1.5h)
6. Test (1.5h)

---

## Key Patterns to Follow

### 1. Single Listener Pattern
```typescript
const loadComplete = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Asset load timeout'));
  }, 10000);
  
  scene.load.once('complete', () => {
    clearTimeout(timeout);
    resolve();
  });
});

scene.load.start();
await loadComplete;
```

### 2. Verification Pattern
```typescript
// After load complete
const verifyResult = TextureVerifier.verifyBatch(scene, textureKeys);

if (verifyResult.invalid.length > 0) {
  return { success: false, failedAssets: verifyResult.invalid };
}

return { success: true, failedAssets: [] };
```

### 3. Error Handling Pattern
```typescript
try {
  await this.loadLevel();
} catch (error) {
  this.showError(error.message);
}
```

### 4. Reference Tracking Pattern
```typescript
// On sprite creation
AssetManager.refTracker.addReference(textureKey);

// On sprite destruction
AssetManager.refTracker.removeReference(textureKey);
```

### 5. Safe Unloading Pattern
```typescript
const result = AssetManager.getInstance().unloadSafe(scene, unusedTextures);

console.log(`Unloaded: ${result.unloaded.join(', ')}`);
console.log(`Skipped: ${result.skipped.join(', ')}`);
```

---

## Testing Strategy

### Manual Testing
1. Successful transition (Mac and Android)
2. Failed asset load (simulate 404)
3. Failed tileset generation
4. Retry button functionality
5. Return to previous level
6. 10 consecutive transitions (memory leak check)

### Automated Testing
1. test-level-transition.js - Basic transition
2. test-texture-verification.js - Verification logic
3. test-error-recovery.js - Error handling
4. test-memory-management.js - Ref counting

---

## Success Criteria

### Phase 1: Atomic Transitions
- ✅ Level transitions work on Mac and Android
- ✅ No `__MISSING` textures
- ✅ All textures verified before use
- ✅ Failed loads show error UI
- ✅ Can retry or return to previous level
- ✅ No partial state on failure

### Phase 2: Memory Management
- ✅ Reference counting tracks all texture usage
- ✅ Only unloads textures with refCount = 0
- ✅ Dependencies checked before unload
- ✅ Memory leak detection runs on transition
- ✅ Warnings logged for potential leaks

### Overall
- ✅ Build and lint pass
- ✅ All tests pass
- ✅ Works on Mac, Android, iOS, web
- ✅ No race conditions
- ✅ Clear error messages
- ✅ Maintainable code

---

## Files Created

1. `src/systems/TextureVerifier.ts`
2. `src/systems/TextureReferenceTracker.ts`
3. `src/systems/MemoryMonitor.ts`
4. `src/scenes/LoadingScene.ts`
5. `test/tests/loading/test-level-transition.js`
6. `test/tests/loading/test-texture-verification.js`
7. `test/tests/loading/test-error-recovery.js`
8. `test/tests/loading/test-memory-management.js`

## Files Modified

1. `src/assets/AssetLoader.ts` - Return success/failure, single listener
2. `src/systems/AssetManager.ts` - Add unloadSafe(), canSafelyUnload()
3. `src/scenes/theme/GameSceneRenderer.ts` - Return success/failure from prepareRuntimeTilesets()
4. `src/scenes/GameScene.ts` - Remove loadLevel(), update init()
5. `src/ecs/components/level/LevelExitComponent.ts` - Use LoadingScene
6. `src/main.ts` - Register LoadingScene
