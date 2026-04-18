# Pushable Objects — Implementation Guide

## For New Sessions

### Quick Start

> "Implement pushable objects. Read `features/pushables/README.md` first, then follow `tasks.md`."

### What's Already Done
- [x] Original feature spec (`pushables.md`)
- [x] Requirements document (`requirements.md`)
- [x] Design document (`design.md`) — includes all analyst fixes
- [x] Runtime analysis (`runtime-analysis.md`) — PASS with fixes incorporated
- [x] Failure analysis (`failure-analysis.md`) — PASS with fixes incorporated
- [x] Task breakdown (`tasks.md`)
- [ ] Implementation

### Key Documents (Read in Order)
1. **README.md** (this file) — start here
2. **tasks.md** — implementation phases and subtasks
3. **design.md** — architecture, code patterns, component design
4. **requirements.md** — acceptance criteria for each feature
5. **runtime-analysis.md** — execution flow traces (reference if debugging)
6. **failure-analysis.md** — edge cases and risk register (reference if debugging)

---

## Critical Design Decisions

### 1. PlayerPushState has onExit() for defensive cleanup ✓
**What**: `onExit()` re-enables WalkComponent and clears icon override on ANY state exit.
**Why**: Death and forced transitions bypass `disengage()`. `onExit()` is the only guaranteed cleanup path.
**How**: `disengage()` only handles "wait for move to complete" logic. All cleanup lives in `onExit()`.

### 2. PushableComponent is sole occupant owner during moves ✓
**What**: `GridCollisionComponent` is disabled on the pushable during cell moves.
**Why**: Both `PushableComponent.startMove()` and `GridCollisionComponent.update()` manage grid occupants. During moves, GridCollisionComponent would re-register the pushable in the source cell based on interpolated position, conflicting with the atomic swap.
**How**: `startMove()` sets `gridCollision.enabled = false`. Move completion sets it back to `true`.

### 3. spawnCol/spawnRow = original JSON position ✓
**What**: `PushableComponent.spawnCol/spawnRow` always stores the level-JSON-defined position.
**Why**: Persisted position is used for placement only. The original position is needed for future "reset pushable" features.
**How**: Factory receives `originalCol`/`originalRow` (always JSON values) and passes them to PushableComponent. The `col`/`row` params are the actual spawn position (persisted or JSON).

### 4. Grid occupant updated at move START
**What**: `startMove()` atomically swaps occupants: removes from source, adds to target.
**Why**: Target cell is claimed immediately so nothing else can move into it. Source cell is freed so the player can follow behind.

### 5. Contact detection in PlayerWalkState, not GridCollisionComponent
**What**: After grid collision blocks the player, PlayerWalkState checks if the blocker is a pushable.
**Why**: Keeps GridCollisionComponent generic (SRP). Detection only needed for the player entity.

### 6. Icon override pattern for HUD
**What**: `AttackButtonComponent.setIconOverride('push')` takes priority over NPC proximity check.
**Why**: Push state is discrete, not proximity-based. Override is simpler than adding a third proximity check.

---

## Implementation Order

1. **Phase 1** (1.5h): Entity type, PushableComponent, factory, asset registration
2. **Phase 2** (3h): PlayerPushState, animations, contact detection, icon override
3. **Phase 3** (45min): movedEntities persistence
4. **Phase 4** (1h): Editor integration
5. **Phase 5** (1h): Comprehensive testing

Phases 3 and 4 can run in parallel after their dependencies.

---

## Key Patterns to Follow

### Entity Factory — follow BreakableEntity
```typescript
// Same scaling, same GridCellBlocker + CollisionComponent setup
const scale = grid.cellSize / Math.max(frame.width, frame.height);
```

### State Machine — follow existing IState pattern
```typescript
class PlayerPushState implements IState {
  onEnter(data: PushStateData): void { /* setup */ }
  onUpdate(delta: number): void { /* phase logic */ }
  onExit(): void { /* defensive cleanup — ALWAYS runs */ }
}
```

### Persistence — follow modifiedCells pattern
```typescript
worldStateManager.updateMovedEntity(levelName, entityId, col, row);
// getLevelState() uses ??= [] for backward compat
```

---

## Gotchas

1. **GridCollisionComponent.enabled** — Verify this field exists. If not, add `if (!this.enabled) return;` at the top of `update()` and `enabled = true` as a public field.
2. **AttackButtonComponent access** — PlayerPushState needs the HUD's joystick entity. Follow the pattern used by NPC interaction code to get the reference.
3. **Animation frame indices** — The lean animations use hardcoded frame strings ('224', '225', '226', etc.). Verify these match the player spritesheet's push frames.
4. **isPushBlocked needs BlockedAreaManager** — Pass it from GameScene. It's optional (levels without blocked areas still work).

---

## Success Criteria

- [ ] Player walks into pushable → lean animation, push icon
- [ ] Attack button → pushable moves one cell at 100px/sec
- [ ] Hold attack → continuous pushing
- [ ] Joystick → disengage
- [ ] All 9 blocker types prevent push
- [ ] Projectiles blocked (player + enemy)
- [ ] Enemy pathfinding routes around pushable
- [ ] Persistence round-trip works
- [ ] Death during push → clean cleanup via onExit()
- [ ] Editor: place, edit, save/load pushables
- [ ] Build and lint pass with zero errors
