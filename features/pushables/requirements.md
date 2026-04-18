# Pushable Objects — Requirements

## Overview

Pushable objects are single-sprite entities the player can push across the grid one cell at a time. The player walks into a pushable, enters a contact state with a lean animation, then presses the attack button to push the object in a cardinal direction. Pushables block pathfinding and all projectiles, serving as tactical cover.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| Push directions | Cardinal only (4 directions) |
| Contact animation | Lean loop (subset of push frames) during contact |
| Push animation | Full `push_${direction}` animation during push action |
| Player snap position | Center of adjacent cell on contact |
| Contact detection | GridCellBlocker blocked event (reuse existing system) |
| Player state | New `PlayerPushState` in player StateMachine |
| Projectile blocking | Blocks ALL projectiles (player + enemy) — tactical cover |
| Damage during push | Player disengages, takes damage normally |
| Chain pushing | No — blocked by another pushable |
| Persistence | New `movedEntities` field on `LevelState` |
| `pushEnabled` toggle | JSON field only for v1, event toggling deferred |
| Layer behavior | Inherited from spawn cell, cannot push onto stairs/transitions |
| Push icon | Exists at `public/assets/player/push_icon.png`, needs AssetRegistry registration |
| Input lock during push | Fully locked — no NPC interaction, no pet ability |
| Event triggering | Deferred — purely physical objects for v1 |
| Push speed | 100px/sec (64px cell = 640ms per cell move) |

---

## R1: Pushable Entity Type

**Purpose**: Define `pushable` as a new entity type with grid-blocking behavior.

**Level JSON Format**:
```json
{
  "id": "pushable0",
  "type": "pushable",
  "data": {
    "col": 10,
    "row": 5,
    "texture": "crate",
    "pushEnabled": true,
    "doesPersist": true
  }
}
```

**Properties**:
- `col`, `row`: Grid position
- `texture`: Sprite texture key (any texture available in the editor texture picker)
- `pushEnabled`: Boolean — whether the object can be pushed (default `true`). Read-only in v1; event toggling deferred.
- `doesPersist`: Boolean — whether pushed position persists across level transitions (default `false`)

**Entity Components**:
- `TransformComponent` — world position
- `SpriteComponent` — renders the texture, scaled to fit cell size, `Depth.breakable`
- `ShadowComponent` — shadow beneath the sprite
- `GridPositionComponent` — tracks grid cell, collision box = full cell size
- `GridCellBlocker` — blocks player and enemy movement into the cell
- `CollisionComponent` — blocks all projectiles (`collidesWith: ['player_projectile', 'enemy_projectile']`); on hit, projectile is destroyed (no damage to pushable)
- `PushableComponent` — stores push state (pushEnabled, doesPersist, spawnCol, spawnRow, layer)

**Layer**: Inherited from the cell the pushable is placed on at spawn time. Does not change.

**Acceptance Criteria**:
- `'pushable'` added to `EntityType` union
- Entity factory creates pushable with all listed components
- Sprite scaled to fit cell size using same pattern as `BreakableEntity`
- Blocks player movement (GridCellBlocker)
- Blocks enemy pathfinding (Pathfinder already checks GridCellBlocker occupants)
- Blocks all projectiles — both `player_projectile` and `enemy_projectile` tags
- Projectiles destroyed on contact (no damage to pushable)
- Supports `createOnAnyEvent` / `createOnAllEvents` (existing entity system)
- Levels without pushables load without errors

---

## R2: Push Icon Asset Registration

**Purpose**: Register the push icon in AssetRegistry so it can be used by AttackButtonComponent.

**Asset**: `public/assets/player/push_icon.png` (already exists)

**Registration**: Add to AssetRegistry in the player asset group, following the same pattern as `crosshair`, `lips_icon`, `speech_bubble`.

**Acceptance Criteria**:
- `push_icon` registered in AssetRegistry with key `'push_icon'`
- Loaded as part of the player/core asset group
- Available for use by AttackButtonComponent

---

## R3: Contact Detection

**Purpose**: Detect when the player walks into a pushable and determine the push direction.

**Mechanism**: Reuse the existing `GridCellBlocker` system. When `GridCollisionComponent` blocks the player from moving into a cell, check whether the blocking occupant is a pushable entity (has `PushableComponent`).

**Push Direction Calculation**: Determined by the direction the player was moving when blocked. Only cardinal directions (Up, Down, Left, Right) are valid push directions. If the player approaches diagonally, no contact is made — the player slides along the pushable as normal.

**On Valid Contact**:
1. Player snaps to the center of the cell adjacent to the pushable (in the opposite direction of the push)
2. Player state machine transitions to `PlayerPushState`
3. Player faces the push direction

**Acceptance Criteria**:
- Walking into a pushable from a cardinal direction triggers contact
- Diagonal approach does NOT trigger contact (normal slide behavior)
- Player snaps to center of the adjacent cell
- Contact only triggers if `pushableComponent.pushEnabled` is `true`
- Contact only triggers for cardinal directions (Up, Down, Left, Right)

---

## R4: PlayerPushState

**Purpose**: New player state that handles the contact and push interaction.

**State**: `push` — added to the player's `StateMachine` alongside `idle`, `walk`, `death`.

**Entry Data**: The pushable entity and the push direction (cardinal).

### Phase 1: Contact (Lean)

**Behavior**:
- Player plays a looping lean animation (subset of `push_${direction}` frames — e.g., first 2–3 frames looped)
- Movement joystick is disabled
- HUD attack icon swaps from punch icon to push icon (`push_icon`)
- Player input is fully locked: no NPC interaction, no pet ability, no attack combo
- Player remains stationary at the snap position

**Exit Conditions**:
- Joystick input detected → disengage, transition to `walk` state
- Attack button pressed → transition to Phase 2 (Push)
- Player takes damage → disengage, transition to damage handling (knockback)

### Phase 2: Push

**Behavior**:
- Full `push_${direction}` animation plays
- Pushable moves exactly one cell (64px) in the push direction at 100px/sec
- Player follows behind at the same speed, arriving at the cell the pushable vacated
- Both pushable and player arrive at cell centers simultaneously
- Grid occupant registration updates: pushable removed from old cell, added to new cell

**Destination Validation** (checked before each cell move):
- Target cell must not be: wall, platform, water, out of bounds, blocked area
- Target cell must not contain: another pushable, any entity with GridCellBlocker, any entity with collision
- Target cell must not be a stair/transition cell
- Target cell must be on the same layer as the pushable

**If destination is blocked**:
- Push animation plays (player strains) but pushable does not move
- Player remains in push state — if blocker is later removed, next push attempt succeeds

**Continuous Push**:
- If attack button is still held when a cell move completes, another cell move begins immediately (destination re-validated)
- If attack button is released mid-move, the current cell move completes, then returns to Phase 1 (Contact)

### Phase 3: Release

**Behavior**:
- Player releases joystick or otherwise disengages
- Pushable stays at its current position
- Player transitions to `idle` state
- HUD attack icon reverts to punch icon
- All input re-enabled

**Acceptance Criteria**:
- New `PlayerPushState` registered in player StateMachine
- Lean animation loops during contact
- Full push animation plays during push action
- Pushable moves exactly one cell per push at 100px/sec
- Player follows behind at same speed
- Grid occupant registration updates correctly during move
- Destination validation prevents pushing into walls, water, platforms, blocked areas, other pushables, stairs, out of bounds, different layers
- Blocked push plays animation but doesn't move object
- Continuous push works when button held
- Joystick input disengages from push state
- Damage disengages from push state
- HUD icon swaps to push icon on contact, reverts on disengage
- Fully locked during push: no NPC interaction, no pet ability, no other actions

---

## R5: Push Animation

**Purpose**: Use existing push animations for the push interaction.

**Existing Animations**: `push_${Direction}` defined in PlayerEntity.ts for all 8 directions (frames 224–271), style `'once'`, 6 frames at 0.1s/frame.

**New Animations Needed**:
- `push_lean_${Direction}` — looping animation using a subset of push frames (e.g., frames 0–2 of the push animation, style `'repeat'`). Only needed for the 4 cardinal directions (Up, Down, Left, Right).

**Cardinal Direction Mapping**: Only `Direction.Up`, `Direction.Down`, `Direction.Left`, `Direction.Right` are used for push interactions. The existing 8-direction push animations cover these.

**Acceptance Criteria**:
- Lean animations created for 4 cardinal directions using subset of existing push frames
- Lean animation loops during contact phase
- Full push animation plays during push action
- Animations use existing frames (no new art assets needed)

---

## R6: HUD Icon Swap

**Purpose**: Swap the attack button icon to indicate push capability.

**Behavior**: When the player enters `PlayerPushState`, the `AttackButtonComponent` icon changes from the punch icon to the push icon. When the player exits `PlayerPushState`, the icon reverts.

**Pattern**: Follow the existing icon swap pattern used for NPC interaction (punch ↔ speech bubble). Add `'push'` as a third icon state.

**Acceptance Criteria**:
- Attack button shows push icon during push contact
- Attack button reverts to punch icon on disengage
- No flicker during transitions
- Push icon texture loaded from `push_icon` asset key

---

## R7: Projectile Blocking

**Purpose**: Pushables block all projectiles, acting as tactical cover.

**Behavior**:
- Pushable's `CollisionComponent` has `collidesWith: ['player_projectile', 'enemy_projectile']`
- On hit: projectile is destroyed. No damage to the pushable. No visual effect on the pushable.
- Projectiles that hit a pushable trigger their existing `onWallHit` callback (if any) for visual effects (sparks, etc.)

**Acceptance Criteria**:
- Player projectiles (bullets, rocks, punches) are blocked by pushables
- Enemy projectiles (bones, fireballs, bullets) are blocked by pushables
- Pushable takes no damage
- Projectile visual effects (onWallHit) still trigger

---

## R8: Persistence

**Purpose**: Optionally persist pushed positions across level transitions.

**Storage**: New `movedEntities` field on `LevelState`:

```typescript
type LevelState = {
  liveEntities: string[];
  destroyedEntities: string[];
  firedTriggers: string[];
  modifiedCells: Array<{ col: number; row: number; properties?: string[]; backgroundTexture?: string; layer?: number; }>;
  movedEntities: Array<{ id: string; col: number; row: number; }>;  // NEW
}
```

**Save Behavior**: After each successful push (cell move completes), if `doesPersist` is `true`, update the `movedEntities` array for the current level in WorldState. If an entry for this entity ID already exists, update it. Otherwise, add a new entry.

**Load Behavior**: When spawning a pushable entity, check `movedEntities` for the current level. If an entry exists for this entity's ID, spawn at the persisted `col`/`row` instead of the JSON-defined position.

**Reset Behavior**: When `doesPersist` is `false`, the pushable always spawns at its JSON-defined position on level re-entry. No entry is written to `movedEntities`.

**Acceptance Criteria**:
- `movedEntities` field added to `LevelState` type (defaults to empty array)
- Persisted pushables spawn at their last pushed position on level re-entry
- Non-persisted pushables reset to JSON position on level re-entry
- Existing levels without `movedEntities` in their state load without errors (backward compatible)
- Position updated in WorldState after each successful cell move

---

## R9: Collision Rules — Destination Validation

**Purpose**: Define what blocks a push.

**A push is blocked if the destination cell**:
- Is out of grid bounds
- Is a wall cell
- Is a platform cell
- Contains water (without bridge)
- Is a stair/transition cell
- Is on a different layer than the pushable
- Contains a blocked area polygon (from BlockedAreaManager)
- Contains any entity with `GridCellBlocker` (another pushable, breakable, bug base, etc.)

**No chain pushing**: If the destination contains another pushable, the push is blocked. The pushed pushable does NOT push the second one.

**Acceptance Criteria**:
- All listed blockers prevent the push
- Push animation still plays when blocked (player strains)
- No chain pushing
- Player remains in push state when blocked (can retry)

---

## R10: Damage Disengagement

**Purpose**: Player disengages from pushable when taking damage.

**Behavior**: If the player takes damage (from any source) while in `PlayerPushState`:
1. If mid-push (pushable moving), the current cell move completes (both player and pushable arrive at cell centers)
2. Player exits `PlayerPushState`
3. Normal damage handling applies (knockback, health reduction, invincibility frames)
4. HUD icon reverts to punch icon

**Acceptance Criteria**:
- Damage during contact phase → immediate disengage + damage handling
- Damage during push phase → current move completes, then disengage + damage handling
- Pushable is never left between cells
- Player is never left between cells

---

## R11: Editor Integration

**Purpose**: Support pushable placement and editing in the standalone editor.

**Behavior**:
- `pushable` added to entity palette as a placeable type
- Texture selectable via texture picker (same as cell background textures)
- Context panel shows: id (read-only), type (read-only), position (col/row), texture, `pushEnabled` (checkbox), `doesPersist` (checkbox)
- Standard entity placement, selection, deletion, move operations
- Default values: `pushEnabled: true`, `doesPersist: false`

**Acceptance Criteria**:
- `pushable` appears in entity palette
- Texture picker works for pushable texture selection
- All properties editable in context panel
- Entity serializes correctly in level JSON (round-trip save/load)

---

## Non-Requirements (Deferred)

- Sound effects for pushing
- Destroyable pushables
- `pushEnabled` toggle via events (JSON field exists but not wired to events)
- Event triggering when pushable reaches a cell (design for it later)
- Chain pushing (pushable pushing another pushable)
- Diagonal pushing
- Push speed configuration per entity
- Visual indicator on pushable (glow, outline) when in range

---

## Files to Create

- `src/ecs/entities/pushable/PushableEntity.ts` — Entity factory
- `src/ecs/components/pushable/PushableComponent.ts` — Push state data (pushEnabled, doesPersist, spawnCol, spawnRow, layer)
- `src/ecs/entities/player/PlayerPushState.ts` — New player state

## Files to Modify

- `src/systems/level/LevelLoader.ts` — Add `'pushable'` to `EntityType` union
- `src/systems/EntityLoader.ts` — Add pushable case to entity creation switch
- `src/systems/WorldState.ts` — Add `movedEntities` to `LevelState` type
- `src/systems/WorldStateManager.ts` — Initialize `movedEntities` in `getLevelState()`, add save/load methods
- `src/assets/AssetRegistry.ts` — Register `push_icon` asset
- `src/ecs/entities/player/PlayerEntity.ts` — Add `push` state to StateMachine, add lean animations
- `src/ecs/components/movement/GridCollisionComponent.ts` — Detect pushable contact on blocked movement
- `src/ecs/components/input/AttackButtonComponent.ts` — Add `'push'` icon state
- `editor/EditorBridge.ts` — Add pushable to entity defaults
- `editor/panels/EntityPalette.ts` — Add pushable to palette
- `editor/panels/EntityForm.ts` — Add pushable-specific fields (texture picker, checkboxes)

---

## Success Criteria

- Player can walk into a pushable from a cardinal direction and enter push contact
- Lean animation loops during contact
- Attack button pushes the object one cell at a time at 100px/sec
- Holding attack button enables continuous pushing
- Pushable blocks all projectiles (player and enemy)
- Pushable blocks enemy pathfinding
- Destination validation prevents pushing into invalid cells
- No chain pushing
- Damage disengages the player
- Joystick input disengages the player
- Persisted pushables remember their position across level transitions
- Non-persisted pushables reset on level re-entry
- Push icon shows during contact, reverts on disengage
- Player is fully locked during push (no NPC, no pet, no other actions)
- Editor supports placement and editing of pushables
- Build and lint pass with zero errors
