# SoundManager — Tasks COMPLETE

## Phase 1: Core Implementation ✅

### Task 1.1: Create SoundManager Singleton ✅
**File**: `src/systems/SoundManager.ts`
- [x] SoundManager singleton with `getInstance()`, `initialize()`, `play()`
- [x] Platform detection via `Capacitor.isNativePlatform()`
- [x] Native backend calls Capacitor plugin, derives sound list from `ASSET_REGISTRY`
- [x] Fallback: native → Phaser `game.sound` → global game reference
- [x] Also initializes from GameScene (covers `?level=` skip-boot path)

### Task 1.2: Create NativeSoundPlugin (Android) ✅
**File**: `android/app/src/main/java/com/dodgingbullets/game/NativeSoundPlugin.java`
- [x] `@CapacitorPlugin(name = "NativeSound")` with SoundPool
- [x] `preload()`: Loads MP3s from assets via AssetFileDescriptor
- [x] `play()`: Plays by key with volume control
- [x] `handleOnDestroy()`: Releases SoundPool

### Task 1.3: Register Plugin in MainActivity ✅
- [x] `registerPlugin(NativeSoundPlugin.class)` before `super.onCreate()`

### Task 1.4: Initialize SoundManager ✅
- [x] BootScene: `void SoundManager.getInstance().initialize(this)`
- [x] GameScene: Also initializes if not already (covers skip-boot path)
- [x] Music stays on Phaser's `this.sound.play('btr_music', ...)`

## Phase 2: Call Site Migration ✅

### Task 2.1: Migrate All SFX Call Sites ✅
- [x] 19 call sites across 13 files migrated to `SoundManager.getInstance().play()`
- [x] Only `BootScene.ts` retains `this.sound.play()` for music

### Task 2.2: Verify ✅
- [x] `grep` confirms no remaining SFX calls on Phaser
- [x] Build passes

## Phase 3: Testing ✅

### Task 3.1: Web Testing ✅
- [x] All sounds play on desktop browser

### Task 3.2: Android Testing ✅
- [x] Native SoundPool backend active
- [x] Latency significantly improved (~300ms → ~30ms)
- [x] All SFX play correctly

## Deviations from Design
- Simplified from separate backend classes to inline logic in SoundManager (fewer abstractions)
- Added `isInitialized` getter for GameScene to check before re-initializing
- Added global game reference fallback for robustness
