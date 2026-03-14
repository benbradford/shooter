# Level Loading System - Design (REDESIGNED)

## Architecture Overview

Simple, linear flow with verification AFTER loading:

```
LevelExitComponent
  ↓
LoadingScene.init(targetLevel, targetCol, targetRow)
  ↓
LoadingScene.create()
  ↓ shows UI
LoadingScene.loadLevel() [async]
  ↓
Load level JSON
  ↓
Queue all assets (no verification)
  ↓
Wait for 'complete' event
  ↓
Verify all textures ← AFTER loading
  ↓
Success? → Start GameScene
Failure? → Show error UI
```

## Key Design Decisions

### 1. Verify AFTER Loading (Not Before)

**Correct:**
```typescript
// Queue all assets
for (const asset of assets) {
  scene.load.image(asset, path);
}

// Start loading
scene.load.start();

// Wait for complete
await loadComplete;

// NOW verify
for (const asset of assets) {
  if (!TextureVerifier.verifyTexture(scene, asset)) {
    failed.push(asset);
  }
}
```

**Wrong (original design):**
```typescript
// Check BEFORE loading
if (TextureVerifier.verifyTexture(scene, asset)) {
  return; // Skip load
}

// Then load
scene.load.image(asset, path);
```

### 2. Single Responsibility

**LoadingScene**: Orchestrates loading
**TextureVerifier**: Verifies textures (only after loading)
**Asset loading**: Just queues and waits

### 3. Single 'complete' Listener

```typescript
const loadComplete = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
  
  scene.load.once('complete', () => {
    clearTimeout(timeout);
    resolve();
  });
});
```

## Component Design

### LoadingScene

```typescript
class LoadingScene extends Phaser.Scene {
  private targetLevel!: string;
  private targetCol!: number;
  private targetRow!: number;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  
  init(data: { targetLevel: string; targetCol: number; targetRow: number }): void {
    this.targetLevel = data.targetLevel;
    this.targetCol = data.targetCol;
    this.targetRow = data.targetRow;
    
    // Stop other scenes
    this.scene.stop('GameScene');
    this.scene.stop('HudScene');
  }
  
  create(): void {
    // Create progress bar
    this.progressBar = this.add.graphics();
    this.progressText = this.add.text(400, 300, 'Loading...', { fontSize: '24px' });
    
    // Start loading (don't await - let Phaser update loop continue)
    this.loadLevel().catch(error => {
      this.showError(error.message);
    });
  }
  
  private async loadLevel(): Promise<void> {
    // 1. Load level JSON
    const levelData = await LevelLoader.load(this.targetLevel);
    
    // 2. Get required assets
    const assets = this.getRequiredAssets(levelData);
    
    // 3. Queue all assets (no verification)
    for (const asset of assets) {
      this.load.image(asset, `/assets/${asset}.png`);
    }
    
    // 4. Track progress
    this.load.on('progress', (value: number) => {
      this.updateProgress(Math.floor(value * 100));
    });
    
    // 5. Wait for complete (single listener)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Load timeout')), 10000);
      
      this.load.once('complete', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this.load.start();
    });
    
    // 6. Verify all textures (AFTER loading)
    const failed: string[] = [];
    for (const asset of assets) {
      if (!TextureVerifier.verifyTexture(this, asset)) {
        failed.push(asset);
      }
    }
    
    // 7. Handle result
    if (failed.length > 0) {
      throw new Error(`Failed to load: ${failed.join(', ')}`);
    }
    
    // 8. Success - start game
    this.scene.start('GameScene', {
      levelData,
      playerCol: this.targetCol,
      playerRow: this.targetRow
    });
    this.scene.start('HudScene');
  }
  
  private updateProgress(percent: number): void {
    this.progressText.setText(`Loading... ${percent}%`);
    
    // Draw progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ff00);
    this.progressBar.fillRect(300, 350, percent * 2, 20);
  }
  
  private showError(message: string): void {
    // Clear loading UI
    this.progressBar.clear();
    this.progressText.setText(`Error: ${message}`);
    
    // Add retry button
    const retryButton = this.add.text(400, 400, 'Retry', { fontSize: '20px' })
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.restart();
      });
  }
}
```

### TextureVerifier

```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean {
    // Step 1: Exists check
    if (!scene.textures.exists(key)) {
      console.error(`[TextureVerifier] Texture '${key}' does not exist`);
      return false;
    }
    
    // Step 2: Get texture
    const texture = scene.textures.get(key);
    if (!texture) {
      console.error(`[TextureVerifier] Texture '${key}' get() returned null`);
      return false;
    }
    
    // Step 3: Has frames
    if (!texture.frames || Object.keys(texture.frames).length === 0) {
      console.error(`[TextureVerifier] Texture '${key}' has no frames`);
      return false;
    }
    
    // Step 4: First frame has source
    const firstFrame = texture.frames[Object.keys(texture.frames)[0]];
    if (!firstFrame || !firstFrame.source) {
      console.error(`[TextureVerifier] Texture '${key}' first frame has no source`);
      return false;
    }
    
    // Step 5: Source has dimensions
    if (firstFrame.source.width === 0 || firstFrame.source.height === 0) {
      console.error(`[TextureVerifier] Texture '${key}' source has zero dimensions`);
      return false;
    }
    
    return true;
  }
  
  static verifyBatch(scene: Phaser.Scene, keys: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const key of keys) {
      if (this.verifyTexture(scene, key)) {
        valid.push(key);
      } else {
        invalid.push(key);
      }
    }
    
    return { valid, invalid };
  }
}
```

## Execution Flow (Verified)

### Scenario: Player exits to new level

```
1. Player steps on exit cell
2. LevelExitComponent.update() detects overlap
3. Call scene.scene.start('LoadingScene', { targetLevel: 'house3_interior', targetCol: 5, targetRow: 8 })
4. Phaser stops GameScene, starts LoadingScene
5. LoadingScene.init() executes
   5.1. Store targetLevel = 'house3_interior'
   5.2. Store targetCol = 5, targetRow = 8
   5.3. Call scene.stop('GameScene')
   5.4. Call scene.stop('HudScene')
6. LoadingScene.create() executes
   6.1. Create progressBar graphics
   6.2. Create progressText
   6.3. Call this.loadLevel() [async, don't await]
7. loadLevel() executes [async]
   7.1. await LevelLoader.load('house3_interior')
   7.2. Fetch /levels/house3_interior.json
   7.3. Parse JSON → levelData
   7.4. Call getRequiredAssets(levelData)
   7.5. Returns ['sconce_flame', 'fireplace1', 'bed1', ...]
   7.6. For each asset:
        7.6.1. this.load.image(asset, path) [queues, doesn't load]
   7.7. Register 'progress' listener
   7.8. Create Promise with 'complete' listener (single)
   7.9. Call this.load.start() [starts async loading]
   7.10. Phaser loads all assets asynchronously
   7.11. 'complete' event fires
   7.12. Promise resolves
   7.13. NOW verify textures:
         7.13.1. For 'sconce_flame': TextureVerifier.verifyTexture(this, 'sconce_flame')
         7.13.2. Check exists → TRUE (loaded in 7.10)
         7.13.3. Check get() → valid object
         7.13.4. Check frames → has frames
         7.13.5. Check source → valid
         7.13.6. Check dimensions → width/height > 0
         7.13.7. Return true
         7.13.8. Repeat for all assets
   7.14. All pass → failed = []
   7.15. Call scene.start('GameScene', { levelData, playerCol: 5, playerRow: 8 })
   7.16. Call scene.start('HudScene')
8. GameScene.init() executes
   8.1. Store levelData
   8.2. Store playerCol = 5, playerRow = 8
9. GameScene.create() executes
   9.1. Initialize grid
   9.2. Spawn entities
   9.3. Render sprites using verified textures
```

**Timing Verification:**
- ✅ Textures verified AFTER 'complete' (step 7.13)
- ✅ Textures exist when verified (loaded in 7.10)
- ✅ No verification before loading (step 7.6 just queues)
- ✅ Single 'complete' listener (step 7.8)
- ✅ Atomic: all pass or error (step 7.14-7.15)

**No backwards logic detected.**

## Error Handling

### Load Timeout

```typescript
await new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Load timeout after 10 seconds'));
  }, 10000);
  
  this.load.once('complete', () => {
    clearTimeout(timeout);
    resolve();
  });
  
  this.load.start();
});
```

### Verification Failure

```typescript
const failed: string[] = [];
for (const asset of assets) {
  if (!TextureVerifier.verifyTexture(this, asset)) {
    failed.push(asset);
  }
}

if (failed.length > 0) {
  throw new Error(`Failed to load: ${failed.join(', ')}`);
}
```

### Error UI

```typescript
private showError(message: string): void {
  this.progressBar.clear();
  this.progressText.setText(`Error: ${message}`);
  
  const retryButton = this.add.text(400, 400, 'Retry', { fontSize: '20px' })
    .setInteractive()
    .on('pointerdown', () => {
      this.scene.restart(); // Restart LoadingScene
    });
}
```

## Why This Design Works

1. **Simple** - Linear flow, easy to trace
2. **Correct timing** - Verify AFTER loading
3. **Single listener** - No race conditions
4. **Atomic** - All or nothing
5. **Clear errors** - Specific failure messages
6. **Recoverable** - Retry button

## What We Learned

**Original design flaw:** Specified verification BEFORE loading in requirements.md section 0.6.

**Root cause:** Didn't trace execution flow to verify timing.

**Solution:** Use verify-execution-flow SOP to catch backwards logic before implementation.

**Key insight:** If you can't trace the execution clearly, the design has problems.
