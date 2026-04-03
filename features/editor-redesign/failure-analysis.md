# Failure Analysis: Editor Redesign (Pass 3 — Final Verification)

## Context

Pass 1 identified 7 risks (1 critical, 3 high, 3 medium). Design was revised; all 7 mitigated.
Pass 2 verified the 7 mitigations and found 2 new medium risks (N1, N3). Design was revised again.
This pass verifies N1 and N3 are now addressed.

---

## N1: `isLoading` Stuck True If Scene Init Fails

**Original Problem:** `isLoading` set `true` before `scene.restart()`. If `GameScene.create()` threw after the inner level-load try/catch (e.g., in asset loading or entity spawning), `notifySceneReady()` never fired and `isLoading` stayed `true` forever — freezing the editor.

**Required Fix:** Outer try/catch around entire editor init; `notifySceneReady()` fires unconditionally.

**Verification Against Revised Design:**

1. Design decision #11 states: *"The entire editor init path is wrapped in try/catch. `bridge.notifySceneReady()` fires unconditionally after the try/catch block."*

2. In `GameScene.create()`, the editor path structure is:
   ```
   try {
     // ALL editor init: level load, asset preload, grid init, entity spawning, camera setup
   } catch (e) {
     // Fallback: empty 10×10 grid + fresh EntityManager + onLoadError toast
   }
   // OUTSIDE try/catch — always executes:
   bridge.setScene(this);
   bridge.notifySceneReady();  // clears isLoading
   return;
   ```

3. The catch block initializes minimal fallback state (`this.grid`, `this.entityManager`) so bridge accessors (`getGrid()`, `getEntityManager()`) don't crash after recovery.

**Status: ✅ MITIGATED**
- Outer try/catch covers asset loading, grid init, entity spawning — all previously uncaught paths
- `notifySceneReady()` is structurally unreachable only if the JS engine itself crashes (not a design concern)
- Fallback state ensures bridge remains functional after error recovery

---

## N3: `isDragBatching` Stuck True on Focus Loss

**Original Problem:** User alt-tabs during paint drag → `pointerup` never fires → `endDragMutation()` never called → `isDragBatching` stays `true` → all subsequent mutations skip snapshotting → undo history silently broken.

**Required Fix:** `window.blur` listener to clean up active drags; safety reset in `onPointerDown`.

**Verification Against Revised Design:**

1. Design decision #12 states: *"A `window.blur` listener calls `endDragMutation()` if a drag is active. Additionally, `onPointerDown` resets any orphaned drag state before starting a new interaction."*

2. In `CanvasInteraction` constructor:
   ```typescript
   window.addEventListener('blur', () => {
     if (this.isDragging) {
       this.bridge.endDragMutation();
       this.isDragging = false;
       this.lastPaintedCell = null;
     }
   });
   ```

3. In `onPointerDown`, before any tool logic:
   ```typescript
   if (this.isDragging) {
     this.bridge.endDragMutation();
     this.isDragging = false;
     this.lastPaintedCell = null;
   }
   ```

**Status: ✅ MITIGATED**
- `window.blur` catches alt-tab, window switch, and OS-level focus changes during drag
- `onPointerDown` safety reset is a belt-and-suspenders catch for any edge case where blur didn't fire (e.g., programmatic focus change)
- Both paths call `endDragMutation()` which sets `isDragBatching = false`, restoring normal snapshot behavior

---

## Full Risk Register (All Passes)

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | Invalid level load bricks editor | CRITICAL | ✅ MITIGATED |
| 2 | Canvas clicks during async level load | HIGH | ✅ MITIGATED |
| 3 | Save + level-switch race | HIGH | ✅ MITIGATED |
| 4 | Grid resize orphans entities | HIGH | ✅ MITIGATED |
| 5 | Paint-drag per-cell snapshots | MEDIUM | ✅ MITIGATED |
| 6 | Unhandled fetch errors | MEDIUM | ✅ MITIGATED |
| 7 | Silent no-name save | MEDIUM | ✅ MITIGATED |
| N1 | `isLoading` stuck true on scene init failure | MEDIUM | ✅ MITIGATED |
| N2 | `isSaving` stuck after level switch | — | ✅ NO RISK |
| N3 | `isDragBatching` stuck on focus loss | MEDIUM | ✅ MITIGATED |
| N4 | Stale `outOfBounds` array in resize | — | ✅ NO RISK |
| N5 | `onLoadError` not registered on first boot | — | ✅ NO RISK |
| N6 | Listener accumulation on scene restarts | — | ✅ NO RISK |
| N7 | Empty fallback level has no player | — | ✅ NO RISK |

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Edge cases handled | ✅ PASS |
| Timing attacks don't crash | ✅ PASS |
| Resource stress stable | ✅ PASS |
| Invalid states fail gracefully | ✅ PASS |
| Recovery paths defined | ✅ PASS |

## Overall: ✅ PASS

All 9 identified risks (7 original + N1 + N3) are mitigated. No new risks introduced by the N1/N3 fixes. Zero open items.

**Confidence Level: HIGH** — All mitigations verified against concrete code in the design document. No architectural changes needed.
