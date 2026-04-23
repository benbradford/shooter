# Escort Entity — Implementation Guide

## Quick Start

Read these files in order:
1. `features/escort/requirements.md` — What the escort does
2. `features/escort/design.md` — How it works (revised with all analyst fixes)
3. `features/escort/tasks.md` — Implementation phases and checklist

## Architecture Summary

The escort is a **single-entity, single-component** design:
- `EscortComponent` is a monolithic state machine (like `LaserBeamComponent`, `PushableComponent`)
- States: dormant → awakening → following ↔ crouching → walking_to_destination → completing → completed
- Cross-level persistence via WorldState flags (no level JSON dependency after awakening)

## Key Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Entity factory | `src/ecs/entities/pushable/PushableEntity.ts` |
| Shadow init | Any entity factory — always call `shadow.init()` |
| Animation map | `src/ecs/entities/escort/KnightAnimations.ts` (new) |
| Pathfinding | `src/ecs/components/pet/PetFollowComponent.ts` |
| Event listener | `src/ecs/components/lever/LeverComponent.ts` |
| Cross-level spawn | `src/systems/PetManager.ts` (similar concept) |

## Critical Fixes (from Runtime & Failure Analysis)

These fixes are already incorporated into design.md. Don't skip them:

1. **V1**: Always call `shadow.init()` after adding ShadowComponent
2. **V2**: Track event registration with `isEventRegistered` boolean; deregister in `onDestroy()` unconditionally
3. **V3**: Asset loading must check `current_escort` flag AND `escort_*_completed` flags, not just level JSON entities
4. **V4**: Set sprite+shadow alpha=0 for `waiting_for_player_move` state in factory
5. **V5**: Pass col/row to EscortComponent constructor for playerSpawnCol/Row tracking
6. **V6**: Explicit death reset in `handleEscortDeathReset()` — do NOT rely on `levelEntrySnapshot` (it's never assigned)
7. **V7**: `spawnCompletedEscorts()` handles completed escorts on non-origin levels
8. **F1**: Completion flags written at START of completing state (before animation), not after
9. **F2**: `recalculatePathToDestination()` falls back to adjacent cells, then reverts to following
10. **F3**: When new escort awakens, clear previous escort's flags and force it to completed

## Files to Create

```
src/ecs/entities/escort/EscortEntity.ts      — Factory function
src/ecs/components/escort/EscortComponent.ts  — State machine
src/ecs/entities/escort/KnightAnimations.ts   — Animation map
```

## Files to Modify

```
src/systems/level/LevelLoader.ts     — EntityType union
src/systems/EntityLoader.ts          — case 'escort'
src/assets/AssetRegistry.ts          — escort asset group
src/assets/AssetLoader.ts            — getRequiredAssetGroups() with V3 fix
src/scenes/GameScene.ts              — spawnCrossLevelEscort(), spawnCompletedEscorts(), handleEscortDeathReset()
src/systems/animation/AnimationSystem.ts — isOnLastFrame() helper
editor/EditorBridge.ts               — defaults + extraction
editor/panels/Toolbar.ts             — ENTITY_TYPES
editor/CanvasInteraction.ts          — label map
editor/panels/ContextPanel.ts        — form fields
```

## Testing Strategy

### Phase 1 (Foundation)
- Place escort in level JSON → renders crouched at correct position

### Phase 2 (State Machine)
- Trigger awakeOnEvent → escort stands up, follows player
- Walk near enemies → escort crouches, stands up when clear
- Reach destination level within range → escort walks to destination, completes

### Phase 3 (Cross-Level)
- Awaken escort, exit level → escort appears in new level (invisible until player moves)
- Complete escort on non-origin level, leave, return → completed pose visible
- Die on origin level → escort reverts to dormant
- Die on non-origin level → escort reappears via cross-level spawn

### Phase 4 (Editor)
- Place escort, edit all fields, save, reload → data preserved

## Analysis Reports

- `features/escort/runtime-analysis.md` — Lifecycle, race conditions, temporal coupling
- `features/escort/failure-analysis.md` — Edge cases, timing attacks, recovery paths
