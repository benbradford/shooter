# Level Loading System - Implementation Plan

## Overview

Iterative implementation with automated testing at each stage. No human verification needed.

## Phase 1: Fix Critical Bugs (2 hours)

### Task 1.1: Remove Manual Destruction ✅
**File:** `src/scenes/LoadingScene.ts`

**Changes:**
1. Remove any `children.removeAll()` calls
2. Remove manual scene cleanup
3. Let Phaser handle destruction

**Test:**
```bash
npm run build && npm run lint
```

**Automated Verification:**
```bash
# Check no children.removeAll in LoadingScene
grep -n "children.removeAll" src/scenes/LoadingScene.ts
# Should return nothing
```

**Time:** 15 minutes

---

### Task 1.2: Fix Texture Unload Timing ✅
**File:** `src/scenes/LoadingScene.ts`

**Changes:**
```typescript
async loadLevel(): Promise<void> {
  // ... load assets ...
  
  // Wait for GameScene shutdown BEFORE unloading
  const gameScene = this.scene.get('game');
  if (gameScene && this.previousLevel) {
    await new Promise<void>(resolve => {
      gameScene.events.once('shutdown', () => {
        this.unloadPreviousLevelAssets(nextLevelData);
        resolve();
      });
    });
  }
  
  // Now start new scene
  this.scene.start('game', { ... });
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Automated Verification:**
Create test level transition:
```bash
node test/scripts/test-transition.js
# Should complete without crash
```

**Time:** 30 minutes

---

### Task 1.3: Add Transition Lock
**File:** `src/scenes/LoadingScene.ts`

**Changes:**
```typescript
export default class LoadingScene extends Phaser.Scene {
  private static isTransitioning = false;
  
  init(data: LoadingSceneData): void {
    if (LoadingScene.isTransitioning) {
      console.warn('[LoadingScene] Transition already in progress');
      return;
    }
    LoadingScene.isTransitioning = true;
    // ... rest of init
  }
  
  private async loadLevel(): Promise<void> {
    try {
      // ... loading logic
    } finally {
      LoadingScene.isTransitioning = false;
    }
  }
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Automated Verification:**
```bash
node test/scripts/test-rapid-transitions.js
# Should handle gracefully, no crashes
```

**Time:** 30 minutes

---

### Task 1.4: Create Automated Test Script
**File:** `test/scripts/test-transition.js`

**Content:**
```javascript
// Test single transition
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  
  // Wait for game to load
  await page.waitForTimeout(2000);
  
  // Trigger transition (move to exit)
  await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    scene.scene.start('LoadingScene', {
      targetLevel: 'grass_overworld1',
      targetCol: 5,
      targetRow: 5,
      previousLevel: 'house3_interior'
    });
  });
  
  // Wait for transition
  await page.waitForTimeout(3000);
  
  // Check for errors
  const errors = await page.evaluate(() => {
    return window.testErrors || [];
  });
  
  if (errors.length > 0) {
    console.error('FAILED: Errors detected:', errors);
    process.exit(1);
  }
  
  console.log('PASSED: Transition completed without errors');
  await browser.close();
})();
```

**Time:** 30 minutes

---

### Task 1.5: Test Phase 1
**Commands:**
```bash
# Start dev server
npm run dev &
DEV_PID=$!

# Wait for server
sleep 3

# Run test
node test/scripts/test-transition.js

# Kill server
kill $DEV_PID
```

**Success Criteria:**
- ✅ Build passes
- ✅ Lint passes
- ✅ Transition test passes
- ✅ No crashes
- ✅ No `__MISSING` textures

**Time:** 15 minutes

---

## Phase 2: Reference Counting (4 hours)

### Task 2.1: Define Core Assets
**File:** `src/constants/CoreAssets.ts` (new)

**Content:**
```typescript
export const CORE_ASSETS = new Set([
  'player_spritesheet',
  'attacker_spritesheet',
  'hud',
  'punch_icon',
  'lips_icon',
  'coin_icon',
  'heart_icon',
  'ammo_icon'
]);
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 10 minutes

---

### Task 2.2: Add Reference Counting to AssetManager
**File:** `src/systems/AssetManager.ts`

**Changes:**
```typescript
import { CORE_ASSETS } from '../constants/CoreAssets';

export class AssetManager {
  private refCounts = new Map<string, number>();
  
  retain(key: string): void {
    const count = this.refCounts.get(key) ?? 0;
    this.refCounts.set(key, count + 1);
  }
  
  release(key: string): void {
    const count = this.refCounts.get(key);
    if (!count) return;
    
    if (count <= 1) {
      this.refCounts.delete(key);
    } else {
      this.refCounts.set(key, count - 1);
    }
  }
  
  canUnload(key: string): boolean {
    if (CORE_ASSETS.has(key)) return false;
    return !this.refCounts.has(key);
  }
  
  unloadUnused(scene: Phaser.Scene): void {
    const textures = scene.textures.getTextureKeys()
      .filter(k => k !== '__DEFAULT' && k !== '__MISSING');
    
    for (const key of textures) {
      if (!this.canUnload(key)) continue;
      
      // Remove animations first
      const deps = this.getDependencies(key);
      for (const dep of deps) {
        if (dep.type === 'animation' && scene.anims.exists(dep.key)) {
          scene.anims.remove(dep.key);
        }
      }
      
      scene.textures.remove(key);
    }
  }
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 1 hour

---

### Task 2.3: Update GameScene Lifecycle
**File:** `src/scenes/GameScene.ts`

**Changes:**
```typescript
create(): void {
  // ... existing create logic ...
  
  // Retain level assets
  const manager = AssetManager.getInstance();
  const assets = AssetManifest.fromLevelData(this.levelData);
  for (const asset of assets) {
    manager.retain(asset);
  }
  
  // Register shutdown handler
  this.events.once('shutdown', () => {
    const manager = AssetManager.getInstance();
    const assets = AssetManifest.fromLevelData(this.levelData);
    for (const asset of assets) {
      manager.release(asset);
    }
  });
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 30 minutes

---

### Task 2.4: Update LoadingScene to Use unloadUnused
**File:** `src/scenes/LoadingScene.ts`

**Changes:**
```typescript
private unloadPreviousLevelAssets(): void {
  const manager = AssetManager.getInstance();
  manager.unloadUnused(this);
  console.log('[LoadingScene] Unloaded unused assets');
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 15 minutes

---

### Task 2.5: Create Memory Leak Test
**File:** `test/scripts/test-memory-leaks.js`

**Content:**
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Perform 10 transitions
  for (let i = 0; i < 10; i++) {
    const level = i % 2 === 0 ? 'house3_interior' : 'grass_overworld1';
    
    await page.evaluate((targetLevel) => {
      const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
      scene.scene.start('LoadingScene', {
        targetLevel,
        targetCol: 5,
        targetRow: 5,
        previousLevel: 'test'
      });
    }, level);
    
    await page.waitForTimeout(2000);
  }
  
  // Check texture count
  const textureCount = await page.evaluate(() => {
    const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
    return scene.textures.getTextureKeys().length;
  });
  
  console.log(`Texture count after 10 transitions: ${textureCount}`);
  
  // Should be roughly stable (not growing unbounded)
  if (textureCount > 100) {
    console.error('FAILED: Possible memory leak detected');
    process.exit(1);
  }
  
  console.log('PASSED: No memory leak detected');
  await browser.close();
})();
```

**Time:** 30 minutes

---

### Task 2.6: Test Phase 2
**Commands:**
```bash
npm run dev &
DEV_PID=$!
sleep 3

# Test single transition
node test/scripts/test-transition.js

# Test memory leaks
node test/scripts/test-memory-leaks.js

kill $DEV_PID
```

**Success Criteria:**
- ✅ Build passes
- ✅ Lint passes
- ✅ Single transition works
- ✅ 10 transitions work
- ✅ Texture count stable
- ✅ Core assets never unloaded

**Time:** 30 minutes

---

## Phase 3: Runtime Texture Registry (2 hours)

### Task 3.1: Create RuntimeTextureRegistry
**File:** `src/systems/RuntimeTextureRegistry.ts` (new)

**Content:**
```typescript
export class RuntimeTextureRegistry {
  private static instance: RuntimeTextureRegistry;
  private runtimeTextures = new Set<string>();
  
  static getInstance(): RuntimeTextureRegistry {
    if (!RuntimeTextureRegistry.instance) {
      RuntimeTextureRegistry.instance = new RuntimeTextureRegistry();
    }
    return RuntimeTextureRegistry.instance;
  }
  
  register(key: string): void {
    this.runtimeTextures.add(key);
  }
  
  isRuntime(key: string): boolean {
    return this.runtimeTextures.has(key);
  }
  
  destroyAll(scene: Phaser.Scene): void {
    for (const key of this.runtimeTextures) {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
    }
    this.runtimeTextures.clear();
  }
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 30 minutes

---

### Task 3.2: Update GameSceneRenderer
**File:** `src/scenes/theme/GameSceneRenderer.ts`

**Changes:**
```typescript
async prepareRuntimeTilesets(levelData: LevelData): Promise<TilesetResult> {
  const registry = RuntimeTextureRegistry.getInstance();
  
  // ... generate tilesets ...
  
  // Register each generated tileset
  registry.register(tilesetKey);
  
  return { success: true, failed: [] };
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 30 minutes

---

### Task 3.3: Update AssetManager to Skip Runtime Textures
**File:** `src/systems/AssetManager.ts`

**Changes:**
```typescript
canUnload(key: string): boolean {
  if (CORE_ASSETS.has(key)) return false;
  if (RuntimeTextureRegistry.getInstance().isRuntime(key)) return false;
  return !this.refCounts.has(key);
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 15 minutes

---

### Task 3.4: Destroy Runtime Textures on Transition
**File:** `src/scenes/LoadingScene.ts`

**Changes:**
```typescript
private unloadPreviousLevelAssets(): void {
  // Destroy runtime textures first
  RuntimeTextureRegistry.getInstance().destroyAll(this);
  
  // Then unload unused
  const manager = AssetManager.getInstance();
  manager.unloadUnused(this);
}
```

**Test:**
```bash
npm run build && npm run lint
```

**Time:** 15 minutes

---

### Task 3.5: Test Phase 3
**Commands:**
```bash
npm run dev &
DEV_PID=$!
sleep 3

node test/scripts/test-transition.js
node test/scripts/test-memory-leaks.js

kill $DEV_PID
```

**Success Criteria:**
- ✅ Build passes
- ✅ Lint passes
- ✅ Transitions work
- ✅ Runtime textures cleaned up
- ✅ No texture leaks

**Time:** 30 minutes

---

## Phase 4: Final Testing (3 hours)

### Task 4.1: Create Comprehensive Test Suite
**File:** `test/scripts/test-all-transitions.js`

**Content:**
```javascript
const puppeteer = require('puppeteer');

const TEST_LEVELS = [
  'house3_interior',
  'grass_overworld1',
  'interior1',
  'dungeon1'
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  let passed = 0;
  let failed = 0;
  
  // Test all level pairs
  for (let i = 0; i < TEST_LEVELS.length; i++) {
    for (let j = 0; j < TEST_LEVELS.length; j++) {
      if (i === j) continue;
      
      const from = TEST_LEVELS[i];
      const to = TEST_LEVELS[j];
      
      console.log(`Testing: ${from} → ${to}`);
      
      try {
        await page.evaluate((targetLevel) => {
          const scene = window.game.scene.scenes.find(s => s.scene.key === 'game');
          scene.scene.start('LoadingScene', {
            targetLevel,
            targetCol: 5,
            targetRow: 5,
            previousLevel: 'test'
          });
        }, to);
        
        await page.waitForTimeout(2000);
        
        const errors = await page.evaluate(() => window.testErrors || []);
        if (errors.length > 0) {
          console.error(`  FAILED: ${errors.join(', ')}`);
          failed++;
        } else {
          console.log(`  PASSED`);
          passed++;
        }
      } catch (error) {
        console.error(`  FAILED: ${error.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
```

**Time:** 1 hour

---

### Task 4.2: Run Full Test Suite
**Commands:**
```bash
npm run dev &
DEV_PID=$!
sleep 3

node test/scripts/test-all-transitions.js

kill $DEV_PID
```

**Success Criteria:**
- ✅ All transitions pass
- ✅ No crashes
- ✅ No `__MISSING` textures
- ✅ Memory stable

**Time:** 1 hour

---

### Task 4.3: Document Results
**File:** `features/levelload/TEST_RESULTS.md`

**Content:**
```markdown
# Level Loading System - Test Results

## Test Environment
- Date: [DATE]
- Platform: [Mac/Linux/Windows]
- Node: [VERSION]
- Phaser: [VERSION]

## Phase 1: Critical Bugs
- ✅ Manual destruction removed
- ✅ Texture unload timing fixed
- ✅ Transition lock added
- ✅ Single transition test: PASSED
- ✅ Rapid transition test: PASSED

## Phase 2: Reference Counting
- ✅ Core assets defined
- ✅ Reference counting implemented
- ✅ GameScene lifecycle updated
- ✅ 10 transition test: PASSED
- ✅ Memory leak test: PASSED
- ✅ Texture count stable: [COUNT]

## Phase 3: Runtime Textures
- ✅ Runtime registry created
- ✅ Renderer integration complete
- ✅ Cleanup on transition: PASSED
- ✅ No runtime texture leaks: PASSED

## Phase 4: Comprehensive Testing
- ✅ All level pairs tested: [X/Y] passed
- ✅ No crashes detected
- ✅ No `__MISSING` textures
- ✅ Memory stable across transitions

## Known Issues
[List any remaining issues]

## Next Steps
[Any follow-up work needed]
```

**Time:** 1 hour

---

## Total Time: 11 hours

## Automated Test Commands

```bash
# Run all tests
./test/scripts/run-all-tests.sh

# Individual tests
node test/scripts/test-transition.js
node test/scripts/test-rapid-transitions.js
node test/scripts/test-memory-leaks.js
node test/scripts/test-all-transitions.js
```

## Success Criteria

- ✅ All automated tests pass
- ✅ No manual verification needed
- ✅ Build and lint pass
- ✅ Works on Mac (primary platform)
- ✅ Memory stable across 10+ transitions
- ✅ Core assets never unloaded
- ✅ Runtime textures cleaned up
- ✅ No `__MISSING` textures
- ✅ No crashes

## Rollback Plan

If any phase fails:
1. Revert to previous phase
2. Document failure
3. Analyze root cause
4. Fix and retry

Each phase is independently testable and revertable.
