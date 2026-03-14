# Level Transition Hang - Diagnosis

## Symptom

Level transition hangs - loading screen appears but never completes.

## Current Code Analysis

### LoadingScene.create() Flow

```typescript
async create(): Promise<void> {
  this.showLoadingUI();
  
  // Stop game scene
  this.scene.stop('game');
  
  // Wait for shutdown
  const gameScene = this.scene.get('game');
  if (gameScene) {
    await new Promise<void>(resolve => {
      gameScene.events.once('shutdown', resolve);
    });
  }
  
  this.loadLevel().catch(...);
}
```

## Problem Identified

**The hang is likely here:**
```typescript
await new Promise<void>(resolve => {
  gameScene.events.once('shutdown', resolve);
});
```

**Why it hangs:**
- `scene.stop('game')` is called
- We wait for 'shutdown' event
- But if the scene is already stopped or in a weird state, the event may never fire
- Promise never resolves → infinite hang

## ChatGPT's Actual Recommendations

From chatgpt.md:

### 1. Don't manually destroy children
✅ Fixed - removed `children.removeAll()`

### 2. Wait for shutdown BEFORE unloading textures
❌ Not properly implemented - we're waiting, but the wait itself is broken

### 3. Correct transition order
```
GameScene
   ↓
Player touches exit
   ↓
Start LoadingScene
   ↓
Stop GameScene
   ↓
GameScene SHUTDOWN fires
   ↓
release assets
   ↓
AssetManager unloadUnused()
   ↓
LoadingScene loads next level
   ↓
Start GameScene again
```

### 4. Use shutdown event properly
```typescript
this.scene.get('game').events.once('shutdown', () => {
   AssetManager.getInstance().unloadUnused(this);
});
```

## Root Cause

I'm waiting for shutdown in the wrong place and wrong way. The shutdown event should trigger the unload, not block the create() method.

## Correct Fix (Following ChatGPT)

LoadingScene should:
1. Show loading UI
2. Start async loading immediately (don't wait for shutdown)
3. Unload previous assets AFTER shutdown event fires
4. Load new assets
5. Start game scene

The key insight: **Don't block on shutdown, let it happen asynchronously while loading.**
