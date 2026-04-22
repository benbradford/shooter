# SoundManager — Task Breakdown

## Phase 1: Core Implementation (2 hours)

### Task 1.1: Create SoundManager Singleton + PhaserSoundBackend
**File**: `src/systems/SoundManager.ts`

**Subtasks**:
- [ ] Create `SoundBackend` interface (`initialize`, `play`)
- [ ] Create `PhaserSoundBackend` (delegates to `scene.sound.play`)
- [ ] Create `NativeSoundBackend` (calls Capacitor plugin, derives sound list from `ASSET_REGISTRY`)
- [ ] Create `SoundManager` singleton with `getInstance()`, `initialize()`, `play()`
- [ ] Platform detection via `Capacitor.isNativePlatform()`
- [ ] Fallback chain: native → Phaser → direct scene fallback
- [ ] All errors caught and logged with `[SoundManager]` prefix

**Dependencies**: None
**Estimated Time**: 45 minutes

---

### Task 1.2: Create NativeSoundPlugin (Android)
**File**: `android/app/src/main/java/com/dodgingbullets/game/NativeSoundPlugin.java`

**Subtasks**:
- [ ] Create `@CapacitorPlugin(name = "NativeSound")` class
- [ ] `load()`: Create `SoundPool` with `maxStreams: 10`, `USAGE_GAME`
- [ ] `preload(PluginCall)`: Read sounds array, load each MP3 from assets via `AssetFileDescriptor`
- [ ] `play(PluginCall)`: Read key + volume, call `soundPool.play()`
- [ ] `handleOnDestroy()`: Release SoundPool
- [ ] Error handling: reject calls with clear messages

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 1.3: Register Plugin in MainActivity
**File**: `android/app/src/main/java/com/dodgingbullets/game/MainActivity.java`

**Subtasks**:
- [ ] Add `registerPlugin(NativeSoundPlugin.class)` before `super.onCreate()`
- [ ] Add import for `NativeSoundPlugin`

**Dependencies**: Task 1.2
**Estimated Time**: 5 minutes

---

### Task 1.4: Initialize SoundManager in BootScene
**File**: `src/scenes/BootScene.ts`

**Subtasks**:
- [ ] Import `SoundManager`
- [ ] Call `await SoundManager.getInstance().initialize(this)` in `create()` before the delayed scene start
- [ ] Music playback stays on `this.sound.play('btr_music', ...)` — NOT migrated

**Dependencies**: Task 1.1
**Estimated Time**: 10 minutes

---

## Phase 2: Call Site Migration (1 hour)

### Task 2.1: Migrate All SFX Call Sites
**Files**: 14 files, 20 call sites

**Subtasks**:
- [ ] `AttackComboComponent.ts` (2 sites): punch sounds + superpunch
- [ ] `DogBarkAbility.ts` (2 sites): bark_sfx
- [ ] `BreakableComponent.ts` (2 sites): thud1 + vase sounds
- [ ] `WaterEffectComponent.ts` (2 sites): splash1 + splash2
- [ ] `SkeletonEntity.ts` (2 sites): bones_spawn + skeleton_hit
- [ ] `RedSkeletonEntity.ts` (2 sites): bones_spawn + skeleton_hit
- [ ] `CellModifierComponent.ts` (1 site): shimmer1
- [ ] `CoinComponent.ts` (1 site): coin sounds
- [ ] `RockThrowAbility.ts` (1 site): splash1
- [ ] `SkeletonAttackState.ts` (1 site): throw_whoosh1
- [ ] `SkeletonDeathState.ts` (1 site): skeleton_death
- [ ] `RedSkeletonDeathState.ts` (1 site): skeleton_death
- [ ] `BreakableEntity.ts` (1 site): thud1

**Pattern**:
```typescript
// Before
this.scene.sound.play('punch1');
// After
SoundManager.getInstance().play('punch1');
```

**Dependencies**: Task 1.1
**Estimated Time**: 30 minutes

---

### Task 2.2: Verify No SFX Calls Remain on Phaser
**Subtasks**:
- [ ] `grep -r "\.sound\.play(" src/` — only `BootScene.ts` (music) should remain
- [ ] Build passes: `npm run build`
- [ ] Lint passes

**Dependencies**: Task 2.1
**Estimated Time**: 10 minutes

---

## Phase 3: Testing (1 hour)

### Task 3.1: Web Testing
**Subtasks**:
- [ ] `npm run dev` — verify all sounds play on desktop browser
- [ ] Verify music still plays in BootScene
- [ ] Verify punch, bark, splash, coin, skeleton sounds all work
- [ ] Verify console shows `[SoundManager] Using Phaser audio backend`

**Dependencies**: Phase 2
**Estimated Time**: 20 minutes

---

### Task 3.2: Android Testing
**Subtasks**:
- [ ] Run `./scripts/build_for_android.sh`
- [ ] Build and deploy APK via Android Studio
- [ ] Verify console shows `[SoundManager] Using native SoundPool backend`
- [ ] Verify all SFX play with noticeably lower latency
- [ ] Verify music still plays
- [ ] Verify no crashes on rapid sound playback (mash punch button)

**Dependencies**: Phase 2, Task 1.2, Task 1.3
**Estimated Time**: 40 minutes

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Core Implementation | 1.5 hours |
| Phase 2: Call Site Migration | 40 minutes |
| Phase 3: Testing | 1 hour |
| **Total** | **~3 hours** |

## Critical Path

```
Task 1.1 (SoundManager.ts) ──→ Task 1.4 (BootScene init) ──→ Task 2.1 (migrate calls) ──→ Task 2.2 (verify)
Task 1.2 (Java plugin) ──→ Task 1.3 (register) ──→ Task 3.2 (Android test)
```

Tasks 1.1 and 1.2 can be done in parallel.

## Risk Areas

1. **SoundPool asset path** — The path `public/assets/sounds/punch1.mp3` must match exactly what's in `android/app/src/main/assets/`. The `build_for_android.sh` script copies `dist/*` to `android/app/src/main/assets/public/`. Verify the path resolves correctly.

2. **SoundPool load timing** — `SoundPool.load()` is async. If `play()` is called before a sound finishes loading, SoundPool silently ignores it. The 1-second BootScene delay should be sufficient, but verify on a slow device.

3. **Capacitor bridge overhead** — Each `play()` call crosses the JS→Java bridge. This adds ~5ms. Combined with SoundPool's ~20ms, total latency should be ~25ms — well under the 50ms target.
