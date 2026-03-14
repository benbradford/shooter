# Level Loading System - Requirements (REDESIGNED)

## Overview

A simple, robust level loading system that loads assets, verifies them AFTER loading, and only proceeds if all are valid.

## What Went Wrong in Original Design

**Fatal Flaw:** Requirements section 0.6 specified verifying textures BEFORE loading:
```typescript
if (TextureVerifier.verifyTexture(scene, key)) return; // Check BEFORE load
scene.load.image(key, path); // Then load
```

**Execution trace revealed backwards logic:**
```
loadAsset('grass1') - texture doesn't exist yet
  → verifyTexture('grass1') 
  → textures.exists('grass1') → FALSE
  → Log error: "Texture 'grass1' does not exist" ← FALSE ERROR
  → Queue load
```

**Root cause:** Verifying before loading logs errors for every new texture.

**Correct order:** Load first, THEN verify.

## New Design Principles

1. **Load, then verify** - Never check if texture exists before loading it
2. **Single responsibility** - Each component does ONE thing
3. **Clear execution flow** - Easy to trace what happens when
4. **Fail fast** - If verification fails, stop immediately with clear error

## Core Components

### 1. LoadingScene

**Purpose**: Orchestrate level transitions atomically

**Execution Flow:**
```
1. User triggers transition (exit portal)
2. LevelExitComponent calls scene.scene.start('LoadingScene', data)
3. LoadingScene.init(data) stores target level
4. LoadingScene.create() shows UI, calls loadLevel()
5. loadLevel() async:
   5.1. Load level JSON
   5.2. Queue all assets
   5.3. Start Phaser loader
   5.4. Wait for 'complete' event
   5.5. Verify all textures ← AFTER loading
   5.6. If any fail: show error, allow retry
   5.7. If all pass: start GameScene
```

**API**:
```typescript
class LoadingScene extends Phaser.Scene {
  init(data: { targetLevel: string; targetCol: number; targetRow: number }): void
  create(): void
  private async loadLevel(): Promise<void>
  private showError(message: string): void
}
```

**Acceptance Criteria**:
- Atomic operation (all or nothing)
- Shows progress 0-100%
- Verifies AFTER loading
- Error UI with retry button
- Never proceeds with broken state

---

### 2. TextureVerifier

**Purpose**: Verify textures are usable AFTER loading

**When to use:** ONLY after 'complete' event fires

**5-Step Verification:**
1. `scene.textures.exists(key)` → true
2. `scene.textures.get(key)` → valid object
3. Texture has frames
4. First frame has source
5. Source width/height > 0

**API**:
```typescript
class TextureVerifier {
  static verifyTexture(scene: Phaser.Scene, key: string): boolean
  static verifyBatch(scene: Phaser.Scene, keys: string[]): { valid: string[]; invalid: string[] }
}
```

**Acceptance Criteria**:
- Returns false if any check fails
- Logs specific failure reason
- NEVER called before loading

---

### 3. Asset Loading (Simplified)

**Purpose**: Queue assets and wait for completion

**Execution Flow:**
```
1. Get required assets from level data
2. For each asset:
   2.1. Queue load (no verification)
3. Start Phaser loader
4. Wait for 'complete' event (single listener)
5. Return (verification happens separately)
```

**API**:
```typescript
async function loadLevelAssets(
  scene: Phaser.Scene,
  levelData: LevelData,
  onProgress?: (percent: number) => void
): Promise<void>
```

**Acceptance Criteria**:
- Single 'complete' listener
- No verification during loading
- Progress tracking
- Timeout rejects promise

---

## Execution Flow Verification

### Critical Path: Level Transition

**Step-by-step execution:**

```
1. Player steps on exit cell
2. LevelExitComponent.update() detects player
3. Line 1: Get target level from data
4. Line 2: Call scene.scene.start('LoadingScene', { targetLevel, targetCol, targetRow })
5. Phaser stops GameScene, starts LoadingScene
6. LoadingScene.init(data) executes
   6.1. Store targetLevel, targetCol, targetRow
7. LoadingScene.create() executes
   7.1. Create progress bar UI
   7.2. Create level name text
   7.3. Call this.loadLevel() [async, don't await]
8. loadLevel() executes [async]
   8.1. Fetch level JSON: await LevelLoader.load(targetLevel)
   8.2. Parse JSON → levelData object
   8.3. Extract required assets from levelData
   8.4. For each asset: scene.load.image(key, path) [queues, doesn't load yet]
   8.5. Register 'progress' listener → update progress bar
   8.6. Register 'complete' listener (single, with timeout)
   8.7. Call scene.load.start() [starts async loading]
   8.8. await 'complete' promise
   8.9. 'complete' fires → all assets loaded into memory
   8.10. NOW verify textures:
         8.10.1. For each asset: TextureVerifier.verifyTexture(scene, key)
         8.10.2. If any fail: collect failed keys
   8.11. If failures: call showError(failedKeys), return
   8.12. If all pass: scene.scene.start('GameScene', { levelData, targetCol, targetRow })
9. GameScene.init(data) executes
   9.1. Store levelData
   9.2. Initialize grid, entities, etc.
10. GameScene.create() executes
   10.1. Render sprites using verified textures
```

**Timing Verification:**
- ✅ Textures verified AFTER 'complete' event (step 8.10)
- ✅ Textures exist when verified (loaded in step 8.9)
- ✅ No verification before loading (step 8.4 just queues)
- ✅ Single 'complete' listener (step 8.6)
- ✅ Atomic: either all pass or show error (step 8.11-8.12)

**Potential Issues:**
- None identified - execution flow is correct

---

## Requirements

### R1: LoadingScene

**Purpose**: Orchestrate level transitions

**Behavior**:
- Stop GameScene and HudScene
- Show loading UI (progress bar, level name)
- Load level JSON
- Queue all assets
- Wait for 'complete'
- Verify all textures
- On success: start GameScene
- On failure: show error with retry

**Acceptance Criteria**:
- Atomic operation
- Progress tracking
- Verification after loading
- Error recovery

---

### R2: TextureVerifier

**Purpose**: Verify textures after loading

**Behavior**:
- 5-step verification
- Returns boolean
- Logs specific failures
- Batch verification support

**Acceptance Criteria**:
- Only called after loading
- Catches broken textures
- Clear error messages

---

### R3: Asset Loading

**Purpose**: Load assets without verification

**Behavior**:
- Queue all assets
- Single 'complete' listener
- Progress tracking
- Timeout handling

**Acceptance Criteria**:
- No verification during load
- Single listener
- Timeout rejects

---

### R4: Error Handling

**Purpose**: Handle failures gracefully

**Behavior**:
- Show error message
- List failed assets
- Retry button
- Return to menu button (future)

**Acceptance Criteria**:
- Clear error messages
- User can retry
- Never proceeds with broken state

---

## Files to Create

1. `src/scenes/LoadingScene.ts` - Orchestration
2. `src/systems/TextureVerifier.ts` - Verification after loading

## Files to Modify

1. `src/ecs/components/level/LevelExitComponent.ts` - Use LoadingScene
2. `src/scenes/GameScene.ts` - Remove loadLevel(), update init()
3. `src/main.ts` - Register LoadingScene

## Success Criteria

- ✅ Textures verified AFTER loading (not before)
- ✅ Clear execution flow (easy to trace)
- ✅ No backwards logic
- ✅ Works on Mac and Android
- ✅ No `__MISSING` textures
- ✅ Atomic transitions
- ✅ Error recovery
