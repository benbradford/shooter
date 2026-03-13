# Level Loading System Redesign

## For New Kiro Sessions

### Quick Start

Say: "Implement the level loading system from features/levelload/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [x] Implementation clarifications written
- [x] Scrutiny questions identified
- [ ] Phase 1: Atomic Transitions (8-10 hours)
- [ ] Phase 2: Memory Management (4-6 hours)
- [ ] Testing complete

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **implementation-clarifications.md** ⭐ - Quick reference for implementation
3. **requirements.md** - What the system does
4. **design.md** - How it works
5. **tasks.md** - Step-by-step implementation
6. **scrutiny.md** - Questions to answer before starting

### Critical Design Decisions

1. **Single 'complete' listener** - Only one listener per load to avoid race conditions
2. **Texture verification required** - 5-step check after 'complete' event
3. **Atomic transitions** - Either fully succeed or fully fail (no partial state)
4. **Error recovery UI** - Retry or return to previous level
5. **Reference counting** - Track texture usage, only unload when count = 0
6. **Dependency checking** - Verify animations/tilesets cleaned up before unloading parent
7. **Android GPU upload delay** - Poll with 50ms intervals for texture readiness
8. **Memory leak detection** - Check for orphaned textures after transitions
9. **Progress tracking** - Show 0-100% during loading
10. **Return to previous level** - User can escape broken state

### Current Problem

**Symptoms**:
- Initial level load: Works on Mac and Android
- Level transitions: Works on Mac, fails on Android
- Textures show as `__MISSING` even though logs say they loaded

**Root Causes**:
1. Multiple 'complete' listeners cause race conditions
2. No verification that textures are actually usable
3. Unloading happens before new textures are ready
4. Runtime tileset generation without source verification
5. No rollback on partial failure

### Solution Overview

**Phase 1: Atomic Transitions**
- LoadingScene handles all loading
- Single 'complete' listener with timeout
- Verify every texture before proceeding
- Show error UI on failure with retry/return options
- Never proceed with broken state

**Phase 2: Memory Management**
- Reference counting tracks texture usage
- Only unload textures with refCount = 0
- Check dependencies before unloading
- Detect and warn about memory leaks

### Implementation Order

**Phase 1: Atomic Transitions** (8-10 hours)
1. Create TextureVerifier (1h)
2. Update AssetLoader (1.5h)
3. Update GameSceneRenderer (1h)
4. Create LoadingScene (3h)
5. Update LevelExitComponent (15min)
6. Update GameScene.init() (30min)
7. Register LoadingScene (5min)
8. Test (2h)

**Phase 2: Memory Management** (4-6 hours)
1. Create TextureReferenceTracker (45min)
2. Add AssetManager.unloadSafe() (1h)
3. Add AssetManager.canSafelyUnload() (30min)
4. Create MemoryMonitor (1.5h)
5. Integrate reference tracking (1.5h)
6. Test (1.5h)

### Success Criteria

**Phase 1: Atomic Transitions**
- ✅ Level transitions work on Mac and Android
- ✅ No `__MISSING` textures
- ✅ All textures verified before use
- ✅ Failed loads show error UI
- ✅ Can retry or return to previous level
- ✅ No partial state on failure

**Phase 2: Memory Management**
- ✅ Reference counting tracks all texture usage
- ✅ Only unloads textures with refCount = 0
- ✅ Dependencies checked before unload
- ✅ Memory leak detection runs on transition
- ✅ Warnings logged for potential leaks

**Overall**
- ✅ Build and lint pass
- ✅ All tests pass
- ✅ Works on Mac, Android, iOS, web
- ✅ No race conditions
- ✅ Clear error messages
- ✅ Maintainable code

### Files to Create

**Core System**:
- `src/systems/TextureVerifier.ts`
- `src/systems/TextureReferenceTracker.ts`
- `src/systems/MemoryMonitor.ts`
- `src/scenes/LoadingScene.ts`

**Tests**:
- `test/tests/loading/test-level-transition.js`
- `test/tests/loading/test-texture-verification.js`
- `test/tests/loading/test-error-recovery.js`
- `test/tests/loading/test-memory-management.js`

### Files to Modify

- `src/assets/AssetLoader.ts` - Return success/failure, single listener
- `src/systems/AssetManager.ts` - Add unloadSafe(), canSafelyUnload()
- `src/scenes/theme/GameSceneRenderer.ts` - Return success/failure
- `src/scenes/GameScene.ts` - Remove loadLevel(), update init()
- `src/ecs/components/level/LevelExitComponent.ts` - Use LoadingScene
- `src/main.ts` - Register LoadingScene

### Common Pitfalls

1. **Don't use multiple 'complete' listeners** - Causes race conditions on Android
2. **Don't skip texture verification** - 'complete' doesn't guarantee usability
3. **Don't proceed on partial failure** - Must be atomic (all or nothing)
4. **Don't unload textures with refCount > 0** - Causes `__MISSING` sprites
5. **Don't forget Android GPU upload delay** - Use waitForTextureReady() with polling

### Testing Checklist

**Phase 1**:
- [ ] Successful transition (Mac)
- [ ] Successful transition (Android)
- [ ] Failed asset load (404)
- [ ] Failed tileset generation
- [ ] Retry button works
- [ ] Return to previous level works
- [ ] No `__MISSING` textures

**Phase 2**:
- [ ] Ref counting increments on sprite creation
- [ ] Ref counting decrements on sprite destruction
- [ ] unloadSafe skips textures in use
- [ ] unloadSafe skips textures with dependencies
- [ ] Memory leak detection finds leaks
- [ ] 10 consecutive transitions without leaks

### Example Usage

**Triggering a transition**:
```typescript
// LevelExitComponent
this.scene.scene.start('LoadingScene', {
  targetLevel: 'house3_interior',
  targetCol: 5,
  targetRow: 8,
  previousLevel: 'grass_overworld1'
});
```

**Verifying textures**:
```typescript
const verifyResult = TextureVerifier.verifyBatch(scene, ['player_spritesheet', 'grass1']);
if (verifyResult.invalid.length > 0) {
  console.error('Failed textures:', verifyResult.invalid);
}
```

**Safe unloading**:
```typescript
const result = AssetManager.getInstance().unloadSafe(scene, unusedTextures);
console.log('Unloaded:', result.unloaded);
console.log('Skipped:', result.skipped);
```

Good luck! 🚀
