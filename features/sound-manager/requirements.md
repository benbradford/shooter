# SoundManager — Requirements

## Overview

Replace all `scene.sound.play()` calls with a `SoundManager` singleton that routes sound playback through Android's native `SoundPool` API on Capacitor builds, eliminating the ~300ms Web Audio latency in Android WebView. On web/desktop, behavior is unchanged — delegates to Phaser's sound system.

## Problem

Android WebView's Web Audio API has ~300ms latency (`baseLatency: 0.085s + outputLatency: 0.216s`). This makes combat sounds (punch, bark, coin pickup) feel disconnected from the action. Android's native `SoundPool` API has ~20-50ms latency.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| Architecture | Singleton `SoundManager` with platform-specific backends |
| Web backend | Delegates to Phaser `scene.sound.play()` (zero behavior change) |
| Android backend | Custom Capacitor plugin using Android `SoundPool` |
| Platform detection | `Capacitor.isNativePlatform()` from `@capacitor/core` |
| Fallback | If native plugin unavailable, fall back to Phaser audio |
| Music | Stays on Phaser's sound system (latency irrelevant for music) |
| Preloading | SoundPool loads from `public/assets/sounds/` at init time |
| Volume | Supported via `{ volume: 0.0–1.0 }` option |

---

## R1: SoundManager Singleton

**Purpose**: Single entry point for all SFX playback.

**API**:
```typescript
class SoundManager {
  static getInstance(): SoundManager;
  initialize(scene: Phaser.Scene): Promise<void>;
  play(key: string, options?: { volume?: number }): void;
}
```

**Behavior**:
- `initialize()` called once during game boot (after Phaser scene exists)
- Detects platform and selects backend (native SoundPool or Phaser)
- `play()` is fire-and-forget — never throws, never blocks
- If called before `initialize()`, falls back to Phaser audio

**Acceptance Criteria**:
- Singleton accessible from anywhere via `SoundManager.getInstance()`
- `play('punch1')` works identically on web and Android
- `play('punch1', { volume: 0.5 })` respects volume on both platforms
- Errors logged to console, never thrown to caller

---

## R2: Web Backend (Phaser Delegate)

**Purpose**: On web/desktop, delegate to Phaser's existing sound system.

**Behavior**:
- `play(key, options)` calls `this.scene.sound.play(key, options)`
- Zero behavior change from current code
- No new dependencies

**Acceptance Criteria**:
- All 20 existing sound call sites work identically after migration
- Music playback in BootScene unaffected (stays on `scene.sound.play`)

---

## R3: Android Backend (Native SoundPool)

**Purpose**: On Android/Capacitor, play SFX through native `SoundPool` for low latency.

**Behavior**:
- Custom Capacitor plugin `NativeSoundPlugin` exposes `preload()` and `play()` to JS
- `preload({ sounds })` loads MP3 files from the app's asset directory into SoundPool
- `play({ key, volume })` plays a preloaded sound immediately
- SoundPool configured with `maxStreams: 10` (enough for concurrent SFX)
- Audio stream type: `STREAM_MUSIC`

**Sound Files**: All 21 MP3 files in `public/assets/sounds/` are preloaded:
- punch1, punch2, punch3, superpunch
- bark_sfx (bark.mp3)
- splash1, splash2
- coin1_sfx (coin1.mp3), coin2_sfx (coin2.mp3)
- shimmer1
- vase1, vase2, vase3
- rock_break1, rock_break2
- thud1
- throw_whoosh1
- bones_spawn
- skeleton_death, skeleton_hit

**File Path Mapping**: Asset keys map to file paths. Most keys match filenames directly. Exceptions:
- `bark_sfx` → `assets/sounds/bark.mp3`
- `coin1_sfx` → `assets/sounds/coin1.mp3`
- `coin2_sfx` → `assets/sounds/coin2.mp3`

The mapping is derived from `AssetRegistry` entries with `type: 'audio'`.

**Acceptance Criteria**:
- All SFX play with <50ms latency on Android
- Volume parameter (0.0–1.0) works
- Multiple sounds can play simultaneously (up to 10 streams)
- Missing/failed sounds logged, not crashed

---

## R4: Platform Detection

**Purpose**: Auto-detect whether to use native or Phaser backend.

**Mechanism**: Use `Capacitor.isNativePlatform()` from `@capacitor/core` (already a dependency).

**Behavior**:
- If `Capacitor.isNativePlatform()` returns `true` AND `NativeSoundPlugin` is available → use native backend
- Otherwise → use Phaser backend

**Acceptance Criteria**:
- Web builds use Phaser backend (no native plugin loaded)
- Android builds use native backend
- If native plugin fails to initialize, falls back to Phaser with console warning

---

## R5: Graceful Fallback

**Purpose**: Never break audio — degrade gracefully.

**Behavior**:
- If native plugin throws during `preload()` → log warning, switch to Phaser backend
- If native plugin throws during `play()` → log warning, attempt Phaser fallback for that call
- If `play()` called with unknown key → log warning, no crash

**Acceptance Criteria**:
- Game never crashes due to sound system errors
- All failures logged with `[SoundManager]` prefix
- Fallback is transparent to callers

---

## R6: Call Site Migration

**Purpose**: Replace all `scene.sound.play()` calls with `SoundManager.play()`.

**Current call sites** (20 total across 14 files):
- `AttackComboComponent.ts` (2): punch1/2/3 random, superpunch
- `DogBarkAbility.ts` (2): bark_sfx
- `BreakableComponent.ts` (2): thud1, vase1/2/3 random
- `WaterEffectComponent.ts` (2): splash1, splash2
- `SkeletonEntity.ts` (2): bones_spawn, skeleton_hit
- `RedSkeletonEntity.ts` (2): bones_spawn, skeleton_hit
- `CellModifierComponent.ts` (1): shimmer1
- `CoinComponent.ts` (1): coin1_sfx/coin2_sfx random
- `RockThrowAbility.ts` (1): splash1
- `SkeletonAttackState.ts` (1): throw_whoosh1
- `SkeletonDeathState.ts` (1): skeleton_death
- `RedSkeletonDeathState.ts` (1): skeleton_death
- `BreakableEntity.ts` (1): thud1

**NOT migrated** (stays on Phaser):
- `BootScene.ts`: `btr_music` — this is background music, not SFX. Latency is irrelevant.

**Migration pattern**:
```typescript
// Before
this.scene.sound.play('punch1');
// After
SoundManager.getInstance().play('punch1');
```

**Acceptance Criteria**:
- All 20 SFX call sites migrated
- Music in BootScene unchanged
- No `scene.sound.play` calls remain for SFX (only music)
- Build and lint pass

---

## Non-Requirements (Deferred)

- Music playback through native (latency irrelevant for music)
- Volume control UI / mute toggle
- Sound priority / ducking
- Positional audio / panning
- iOS native backend (no iOS build currently)
- Preloading per-level (all sounds are small, preload all at boot)

---

## Files to Create

- `src/systems/SoundManager.ts` — Singleton with platform detection + backend routing
- `android/app/src/main/java/com/dodgingbullets/game/NativeSoundPlugin.java` — Capacitor plugin (SoundPool wrapper)

## Files to Modify

- `src/scenes/BootScene.ts` — Call `SoundManager.initialize()` during boot
- `src/scenes/GameScene.ts` — Pass scene reference to SoundManager if not already initialized
- `android/app/src/main/java/com/dodgingbullets/game/MainActivity.java` — Register plugin
- 14 files with `scene.sound.play()` calls → replace with `SoundManager.getInstance().play()`

---

## Success Criteria

- SFX latency on Android drops from ~300ms to <50ms
- All existing sounds play correctly on web (no regression)
- Game never crashes due to sound errors
- Build and lint pass with zero errors
- Music playback unaffected
