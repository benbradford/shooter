# Level Loading System - Design

## Architecture Overview

The level loading system is built on three foundational refactors (Phase 0) that eliminate race conditions and enable atomic transitions:

1. **TextureVerifier** - Ensures textures are actually usable
2. **AssetManifest** - Single source of truth for asset tracking
3. **AssetLoadCoordinator** - Centralized loading with single listener

These enable **LoadingScene** to orchestrate atomic transitions with proper error handling.

```
Phase 0: Foundation
  TextureVerifier → Verifies textures are usable (5-step check)
  AssetManifest → Tracks all required assets (single source of truth)
  AssetLoadCoordinator → Loads with single listener + verification
  
Phase 1: Orchestration
  LoadingScene → Uses foundation to orchestrate atomic transitions
    ↓
  LevelExitComponent triggers LoadingScene
    ↓
  LoadingScene.init({ targetLevel, targetCol, targetRow, previousLevel })
    ↓
  LoadingScene.create()
    ↓
  loadLevel() [async]
    ├─→ AssetLoadCoordinator.loadLevelAssets() [verify all]
    ├─→ GameSceneRenderer.prepareRuntimeTilesets() [verify all]
    ├─→ On success: Initialize GameScene
    └─→ On failure: Show error UI
```

## Phase 0: Foundation Design

### TextureVerifier

**Purpose**: Eliminate the root cause of `__MISSING` textures - assuming 'complete' means usable

**Problem Solved**: 
- `scene.textures.exists()` returns true for broken textures
- 'complete' event fires before GPU upload on Android
- No verification that textures have valid image data

**5-Step Verification**:
```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean {
    // Step 1: Exists check
    if (!scene.textures.exists(key)) {
      console.error(`[TextureVerifier] Texture '${key}' does not exist`);
      return false;
    }
    
    // Step 2: Get texture object
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
}
```

**Android GPU Upload Handling**:
```typescript
static async waitForTextureReady(
  scene: Phaser.Scene,
  key: string,
  timeoutMs: number
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (this.verifyTexture(scene, key)) {
      return true;
    }
    // Give GPU time to upload
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return false;
}
```

**Why This Works**:
- Catches textures that "exist" but are broken
- Polls for GPU upload completion on Android
- Provides specific error messages for debugging
- Works identically on all platforms

---

### AssetManifest

**Purpose**: Eliminate duplicate asset tracking logic scattered across files

**Problem Solved**:
- `getBackgroundTextures()` in one place
- `getRequiredAssetGroups()` in another place
- Manual Set operations in `loadLevel()`
- Easy to miss assets when adding new entity types

**Single Source of Truth**:
```typescript
class AssetManifest {
  static fromLevelData(levelData: LevelData): Set<AssetKey> {
    const assets = new Set<AssetKey>();
    
    // Background textures
    for (const cell of levelData.cells) {
      if (cell.backgroundTexture) {
        const textureName = typeof cell.backgroundTexture === 'string' 
          ? cell.backgroundTexture 
          : cell.backgroundTexture.image;
        assets.add(textureName);
      }
    }
    
    // Entity assets
    for (const entity of levelData.entities) {
      const groups = getRequiredAssetGroups(entity.type);
      for (const group of groups) {
        assets.add(group);
      }
    }
    
    // Animated textures
    for (const cell of levelData.cells) {
      if (cell.animatedTexture) {
        assets.add(cell.animatedTexture.spritesheet);
      }
    }
    
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

**Why This Works**:
- All asset extraction in one place
- Easy to extend with new asset types
- Testable (pure functions)
- No duplicate logic

---

### AssetLoadCoordinator

**Purpose**: Eliminate race conditions from multiple 'complete' listeners

**Problem Solved**:
- `AssetLoader.preloadLevelAssets()` registers listener
- `GameScene.loadLevel()` registers another listener
- On Android, only one fires or they fire in wrong order
- No verification after 'complete'

**Single Listener Pattern**:
```typescript
class AssetLoadCoordinator {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; failedAssets: string[] }> {
    
    // Get required assets (single source of truth)
    const requiredAssets = AssetManifest.fromLevelData(levelData);
    
    // Queue all assets
    for (const assetKey of requiredAssets) {
      const config = ASSET_GROUPS[assetKey];
      if (config.spritesheet) {
        scene.load.spritesheet(
          config.spritesheet,
          `/assets/${assetKey}/${config.spritesheet}.png`,
          { frameWidth: config.frameWidth, frameHeight: config.frameHeight }
        );
      } else if (config.image) {
        scene.load.image(config.image, `/assets/${assetKey}/${config.image}.png`);
      }
    }
    
    // Track progress
    scene.load.on('progress', (value: number) => {
      if (onProgress) onProgress(Math.floor(value * 100));
    });
    
    // SINGLE 'complete' listener with timeout
    const loadComplete = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Asset load timeout'));
      }, 10000);
      
      scene.load.once('complete', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    
    // Start load
    scene.load.start();
    
    try {
      await loadComplete;
    } catch (error) {
      return { success: false, failedAssets: ['timeout'] };
    }
    
    // VERIFY all textures
    const textureKeys = [...requiredAssets].flatMap(key => {
      const config = ASSET_GROUPS[key];
      return config.spritesheet ? [config.spritesheet] : config.image ? [config.image] : [];
    });
    
    const verifyResult = TextureVerifier.verifyBatch(scene, textureKeys);
    
    if (verifyResult.invalid.length > 0) {
      return { success: false, failedAssets: verifyResult.invalid };
    }
    
    return { success: true, failedAssets: [] };
  }
}
```

**Why This Works**:
- Single listener eliminates race conditions
- Timeout rejects (doesn't proceed)
- Verification catches broken textures
- Progress tracking built-in
- Returns explicit success/failure

---

### How Refactors Enable LoadingScene

**Before Refactors**:
- LoadingScene would need to handle race conditions
- LoadingScene would need to duplicate asset tracking
- LoadingScene would need to implement verification
- LoadingScene would be 300+ lines of complex logic

**After Refactors**:
- LoadingScene just orchestrates simple calls
- All complexity handled by foundation
- LoadingScene is ~100 lines of clear logic
- Easy to add error UI and retry logic

**LoadingScene Becomes Simple**:
```typescript
async loadLevel(): Promise<void> {
  // Load level data
  const levelData = await LevelLoader.load(this.targetLevel);
  
  // Load assets (coordinator handles everything)
  const assetResult = await AssetLoadCoordinator.loadLevelAssets(
    this,
    levelData,
    (percent) => this.updateProgress(percent)
  );
  
  if (!assetResult.success) {
    this.showError(`Failed to load: ${assetResult.failedAssets.join(', ')}`);
    return;
  }
  
  // Generate tilesets (renderer handles verification)
  const tilesetResult = await this.renderer.prepareRuntimeTilesets(levelData);
  
  if (!tilesetResult.success) {
    this.showError(`Failed to generate: ${tilesetResult.failed.join(', ')}`);
    return;
  }
  
  // Success - start game
  this.scene.start('GameScene', { levelData, ... });
}
```

---

## Phase 1: LoadingScene Design

### Data Flow

### 1. Trigger Transition

```typescript
// LevelExitComponent
if (playerOnExitCell) {
  this.scene.scene.start('LoadingScene', {
    targetLevel: this.targetLevel,
    targetCol: this.targetCol,
    targetRow: this.targetRow,
    previousLevel: this.scene.currentLevel
  });
}
```

### 2. Loading Scene Lifecycle

```typescript
class LoadingScene extends Phaser.Scene {
  private data!: {
    targetLevel: string;
    targetCol: number;
    targetRow: number;
    previousLevel: string;
  };
  
  init(data: typeof this.data): void {
    this.data = data;
    // Stop other scenes
    this.scene.stop('GameScene');
    this.scene.stop('HudScene');
  }
  
  create(): void {
    // Show loading UI
    this.showLoadingUI();
    
    // Start async load
    this.loadLevel().catch(error => {
      this.showError(error.message);
    });
  }
  
  private async loadLevel(): Promise<void> {
    // Load level JSON
    const levelData = await this.loadLevelData(this.data.targetLevel);
    
    // Load and verify assets
    const assetResult = await AssetLoader.loadLevelAssets(
      this,
      levelData,
      (percent) => this.updateProgress(percent)
    );
    
    if (!assetResult.success) {
      throw new Error(`Failed to load assets: ${assetResult.failedAssets.join(', ')}`);
    }
    
    // Generate and verify tilesets
    const tilesetResult = await this.prepareRuntimeTilesets(levelData);
    
    if (!tilesetResult.success) {
      throw new Error(`Failed to generate tilesets: ${tilesetResult.failed.join(', ')}`);
    }
    
    // Success - start game
    this.scene.start('GameScene', {
      level: this.data.targetLevel,
      levelData: levelData,
      playerCol: this.data.targetCol,
      playerRow: this.data.targetRow
    });
    this.scene.start('HudScene');
  }
  
  private showError(message: string): void {
    // Show error UI with retry/return options
  }
}
```

### 3. Asset Loading with Verification

```typescript
class AssetLoader {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; failedAssets: string[] }> {
    
    // Calculate required assets
    const requiredAssets = this.getRequiredAssets(levelData);
    
    // Queue all assets
    for (const assetKey of requiredAssets) {
      const config = ASSET_GROUPS[assetKey];
      if (config.spritesheet) {
        scene.load.spritesheet(
          config.spritesheet,
          `/assets/${assetKey}/${config.spritesheet}.png`,
          { frameWidth: config.frameWidth, frameHeight: config.frameHeight }
        );
      } else if (config.image) {
        scene.load.image(config.image, `/assets/${assetKey}/${config.image}.png`);
      }
    }
    
    // Track progress
    scene.load.on('progress', (value: number) => {
      if (onProgress) onProgress(Math.floor(value * 100));
    });
    
    // Wait for completion (single listener)
    const loadComplete = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Asset load timeout'));
      }, 10000);
      
      scene.load.once('complete', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    
    // Start load
    scene.load.start();
    
    try {
      await loadComplete;
    } catch (error) {
      return { success: false, failedAssets: ['timeout'] };
    }
    
    // Verify all textures
    const textureKeys = requiredAssets.flatMap(key => {
      const config = ASSET_GROUPS[key];
      return config.spritesheet ? [config.spritesheet] : config.image ? [config.image] : [];
    });
    
    const verifyResult = TextureVerifier.verifyBatch(scene, textureKeys);
    
    if (verifyResult.invalid.length > 0) {
      return { success: false, failedAssets: verifyResult.invalid };
    }
    
    return { success: true, failedAssets: [] };
  }
}
```

### 4. Texture Verification

```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean {
    // Check 1: Exists
    if (!scene.textures.exists(key)) {
      console.error(`[TextureVerifier] Texture '${key}' does not exist`);
      return false;
    }
    
    // Check 2: Get texture object
    const texture = scene.textures.get(key);
    if (!texture) {
      console.error(`[TextureVerifier] Texture '${key}' get() returned null`);
      return false;
    }
    
    // Check 3: Has frames
    if (!texture.frames || Object.keys(texture.frames).length === 0) {
      console.error(`[TextureVerifier] Texture '${key}' has no frames`);
      return false;
    }
    
    // Check 4: First frame has valid source
    const firstFrame = texture.frames[Object.keys(texture.frames)[0]];
    if (!firstFrame || !firstFrame.source) {
      console.error(`[TextureVerifier] Texture '${key}' first frame has no source`);
      return false;
    }
    
    // Check 5: Source has dimensions
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
  
  static async waitForTextureReady(
    scene: Phaser.Scene,
    key: string,
    timeoutMs: number
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.verifyTexture(scene, key)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return false;
  }
}
```

### 5. Runtime Tileset Generation

```typescript
class GameSceneRenderer {
  async prepareRuntimeTilesets(levelData: LevelData): Promise<{ success: boolean; failed: string[] }> {
    const failed: string[] = [];
    
    // Water tilesets
    if (this.needsWaterTileset(levelData)) {
      const sourceTexture = this.getWaterSourceTexture();
      
      // Verify source
      if (!TextureVerifier.verifyTexture(this.scene, sourceTexture)) {
        failed.push(`water_source:${sourceTexture}`);
      } else {
        // Generate
        const generator = new WaterTilesetGenerator(this.scene);
        const success = generator.generateTileset(sourceTexture, 'water_tileset');
        
        if (!success) {
          failed.push('water_tileset');
        } else {
          // Verify generated
          if (!TextureVerifier.verifyTexture(this.scene, 'water_tileset')) {
            failed.push('water_tileset:verification');
          }
        }
      }
    }
    
    // Path tilesets (similar pattern)
    // ...
    
    return { success: failed.length === 0, failed };
  }
}
```

## Platform-Specific Considerations

### Android GPU Upload Timing

**Problem**: On Android, textures may pass `exists()` check but not be in GPU memory yet.

**Solution**: `waitForTextureReady()` polls with 50ms intervals:

```typescript
static async waitForTextureReady(
  scene: Phaser.Scene,
  key: string,
  timeoutMs: number
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (this.verifyTexture(scene, key)) {
      return true;
    }
    // Give GPU time to upload
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return false;
}
```

**Usage**:
```typescript
// After load complete, wait for critical textures
for (const key of criticalTextures) {
  const ready = await TextureVerifier.waitForTextureReady(this, key, 2000);
  if (!ready) {
    failedAssets.push(key);
  }
}
```

## Memory Management

### Reference Counting

```typescript
class TextureReferenceTracker {
  private references = new Map<string, number>();
  
  addReference(key: string): void {
    const current = this.references.get(key) ?? 0;
    this.references.set(key, current + 1);
  }
  
  removeReference(key: string): void {
    const current = this.references.get(key) ?? 0;
    if (current === 0) {
      console.warn(`[TextureReferenceTracker] Attempted to remove reference for '${key}' with count 0`);
      return;
    }
    this.references.set(key, current - 1);
  }
  
  getRefCount(key: string): number {
    return this.references.get(key) ?? 0;
  }
  
  getSafeToUnload(): string[] {
    const safe: string[] = [];
    for (const [key, count] of this.references.entries()) {
      if (count === 0) {
        safe.push(key);
      }
    }
    return safe;
  }
}
```

### Safe Unloading

```typescript
class AssetManager {
  private static refTracker = new TextureReferenceTracker();
  
  unloadSafe(scene: Phaser.Scene, keys: string[]): { unloaded: string[]; skipped: string[] } {
    const unloaded: string[] = [];
    const skipped: string[] = [];
    
    for (const key of keys) {
      const refCount = AssetManager.refTracker.getRefCount(key);
      
      if (refCount > 0) {
        console.warn(`[AssetManager] Skipping unload of '${key}' (refCount: ${refCount})`);
        skipped.push(key);
        continue;
      }
      
      if (!this.canSafelyUnload(scene, key)) {
        console.warn(`[AssetManager] Skipping unload of '${key}' (has dependencies)`);
        skipped.push(key);
        continue;
      }
      
      // Safe to unload
      this.unload(scene, key);
      unloaded.push(key);
    }
    
    return { unloaded, skipped };
  }
  
  canSafelyUnload(scene: Phaser.Scene, key: string): boolean {
    const deps = this.getDependencies(key);
    
    if (deps.length === 0) {
      return true;
    }
    
    // Check if dependencies are cleaned up
    for (const dep of deps) {
      if (dep.type === 'animation' && scene.anims.exists(dep.key)) {
        console.warn(`[AssetManager] Cannot unload '${key}': animation '${dep.key}' still exists`);
        return false;
      }
      if (dep.type === 'tileset' && scene.textures.exists(dep.key)) {
        console.warn(`[AssetManager] Cannot unload '${key}': tileset '${dep.key}' still exists`);
        return false;
      }
    }
    
    return true;
  }
}
```

### Memory Leak Detection

```typescript
class MemoryMonitor {
  static checkForLeaks(scene: Phaser.Scene): { leaked: string[]; warnings: string[] } {
    const leaked: string[] = [];
    const warnings: string[] = [];
    
    // Check for textures with refs but no sprites
    const refTracker = AssetManager.getRefTracker();
    const allTextures = scene.textures.list;
    
    for (const [key, texture] of Object.entries(allTextures)) {
      const refCount = refTracker.getRefCount(key);
      
      if (refCount > 0) {
        // Check if any sprites actually use it
        const spritesUsingTexture = this.findSpritesUsingTexture(scene, key);
        
        if (spritesUsingTexture.length === 0) {
          leaked.push(key);
          warnings.push(`Texture '${key}' has refCount ${refCount} but no sprites using it`);
        }
      }
    }
    
    // Check for animations referencing unloaded textures
    const anims = scene.anims.anims.entries;
    for (const [key, anim] of Object.entries(anims)) {
      const textureKey = anim.frames[0]?.textureKey;
      if (textureKey && !scene.textures.exists(textureKey)) {
        warnings.push(`Animation '${key}' references unloaded texture '${textureKey}'`);
      }
    }
    
    return { leaked, warnings };
  }
  
  private static findSpritesUsingTexture(scene: Phaser.Scene, textureKey: string): Phaser.GameObjects.Sprite[] {
    const sprites: Phaser.GameObjects.Sprite[] = [];
    
    scene.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Sprite && child.texture.key === textureKey) {
        sprites.push(child);
      }
    });
    
    return sprites;
  }
}
```

## Error Handling

### Error UI

```typescript
class LoadingScene extends Phaser.Scene {
  private showError(message: string): void {
    // Clear loading UI
    this.children.removeAll();
    
    // Show error message
    const errorText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      `Failed to load level:\n${message}`,
      { fontSize: '24px', color: '#ff0000', align: 'center' }
    ).setOrigin(0.5);
    
    // Retry button
    const retryButton = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      'Retry',
      { fontSize: '20px', color: '#ffffff', backgroundColor: '#0000ff', padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setInteractive();
    
    retryButton.on('pointerdown', () => {
      this.scene.restart();
    });
    
    // Return button
    const returnButton = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      'Return to Previous Level',
      { fontSize: '20px', color: '#ffffff', backgroundColor: '#00ff00', padding: { x: 20, y: 10 } }
    ).setOrigin(0.5).setInteractive();
    
    returnButton.on('pointerdown', () => {
      this.scene.start('LoadingScene', {
        targetLevel: this.data.previousLevel,
        targetCol: 0,
        targetRow: 0,
        previousLevel: this.data.targetLevel
      });
    });
  }
}
```

## State Management

### Level State Preservation

```typescript
class GameScene extends Phaser.Scene {
  private saveCurrentState(): void {
    // Save to WorldStateManager before transition
    WorldStateManager.getInstance().saveState();
  }
  
  init(data: { level: string; levelData: LevelData; playerCol: number; playerRow: number }): void {
    this.currentLevel = data.level;
    this.levelData = data.levelData;
    this.playerSpawnCol = data.playerCol;
    this.playerSpawnRow = data.playerRow;
  }
}
```

## Success Criteria

### Phase 1: Atomic Transitions
- Single 'complete' listener per load
- All textures verified before use
- Failed loads show error UI
- Can retry or return to previous level
- No partial state on failure

### Phase 2: Memory Management
- Reference counting tracks all texture usage
- Only unloads textures with refCount = 0
- Dependencies checked before unload
- Memory leak detection runs on transition
- Warnings logged for potential leaks
