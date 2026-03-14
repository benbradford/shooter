# Level Loading System - Implementation Clarifications

## Critical Design Decisions (Finalized)

### 1. Verify AFTER Loading ✓
- **What**: Textures verified only after 'complete' event fires
- **Why**: Verifying before loading logs false errors
- **How**: Queue all assets → wait for complete → verify all

### 2. Single 'complete' Listener ✓
- **What**: Only one listener per load operation
- **Why**: Multiple listeners cause race conditions on Android
- **How**: Use Promise with single `scene.load.once('complete', resolve)`

### 3. No Verification During Loading ✓
- **What**: Asset loading just queues and waits
- **Why**: Verification is separate concern
- **How**: loadLevelAssets() returns void, verification happens in LoadingScene

### 4. Atomic Transitions ✓
- **What**: Either fully succeed or fully fail
- **Why**: Prevents broken game state
- **How**: LoadingScene verifies all before starting GameScene

### 5. Simple Error Recovery ✓
- **What**: Show error with retry button
- **Why**: User can recover from failures
- **How**: scene.restart() to retry

## Implementation Order

1. **TextureVerifier** (30 min) - 5-step verification
2. **LoadingScene** (2 hours) - Orchestration with UI
3. **Update LevelExitComponent** (10 min) - Use LoadingScene
4. **Update GameScene.init()** (15 min) - Accept level data
5. **Register LoadingScene** (5 min) - Add to main.ts

**Total: ~3 hours**

## Key Patterns

### Single Listener Pattern
```typescript
await new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
  scene.load.once('complete', () => {
    clearTimeout(timeout);
    resolve();
  });
  scene.load.start();
});
```

### Verification Pattern
```typescript
// AFTER load complete
const failed: string[] = [];
for (const asset of assets) {
  if (!TextureVerifier.verifyTexture(scene, asset)) {
    failed.push(asset);
  }
}
if (failed.length > 0) throw new Error(`Failed: ${failed.join(', ')}`);
```

## Success Criteria

- ✅ Textures verified AFTER loading
- ✅ Clear execution flow
- ✅ No backwards logic
- ✅ Works on Mac and Android
- ✅ Atomic transitions
