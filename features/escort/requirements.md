# Escort Entity — Requirements

## Overview

A new entity type `escort` that follows the player across levels toward a destination cell. The first subtype is `knight` — a fearful armored figure that crouches when enemies are nearby and walks with a scary gait when safe. Escorts are awakened by a game event, follow the player through a configurable set of levels, and complete their journey by reaching a destination cell where they play a final animation and become permanently stationary.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| EntityType | `'escort'` with a `subtype` field (e.g., `'knight'`) |
| Blocks movement | No — walk-through like NPC |
| Wall collision | Yes — `GridCollisionComponent` for wall avoidance (like pet) |
| Follow speed | Configurable per-entity (`followSpeed` in JSON data) |
| Teleport if too far | Yes (like pet at 800px) |
| Layer handling | Sync layer with player (like pet) |
| Cross-level appearance | Only in levels listed in `followToLevels` array |
| Spawn animation in new room | None — instant appear |
| Enemy detection distance | Pixel distance, configurable per-entity (`enemyDetectDistancePx`) |
| Enemy detection targets | All entities tagged `'enemy'` |
| Stand-up after enemies leave | Play crouch animation in REVERSE |
| Projectile interaction | Pass through (no collision) |
| Scale | ~0.94 to fit cell (68px in 64px cell), or 1.0 — designer's choice |
| Depth | Same as NPC (`Depth.enemy`) |
| Shadow | Yes |
| Frame rate | 10fps (0.1s per frame) |
| Crouch frame 4 | Last frame (0-indexed frame 4 of 5-frame animation) |
| Destination blocked | Wait at nearest reachable cell |
| Only one active escort | Yes — single `current_escort` flag value |
| Death on origin level | Escort returns to dormant at original spawn |
| Death on other levels | Escort does default enter-level-and-follow behavior |
| Editor label | `'ES'` |
| Pauses during interactions | Yes (like all other entities) |

---

## R1: Escort Entity Type Registration

**Purpose**: Register `escort` as a new entity type in the entity system.

**Level JSON Format**:
```json
{
  "id": "escort0",
  "type": "escort",
  "data": {
    "col": 15,
    "row": 10,
    "escortType": "knight",
    "destinationLevel": "dungeon3",
    "destinationCol": 5,
    "destinationRow": 12,
    "awakeOnEvent": "knight_awakened",
    "reachDistance": 15,
    "followSpeed": 200,
    "followToLevels": ["dungeon1", "dungeon2", "dungeon3"],
    "enemyDetectDistancePx": 128
  }
}
```

**Properties**:
- `col`, `row`: Grid position of the escort in its origin level
- `escortType`: Subtype string (e.g., `"knight"`) — determines spritesheet, animations, and subtype-specific behavior
- `destinationLevel`: Level filename (without `.json`) where the escort completes its journey
- `destinationCol`, `destinationRow`: Target cell in the destination level
- `awakeOnEvent`: Event name that transitions the escort from dormant to active
- `reachDistance`: Maximum path length in cells for the escort to walk to its destination (instead of following the player)
- `followSpeed`: Movement speed in pixels per second
- `followToLevels`: Array of level names where the escort will appear when following the player. The escort only spawns in these levels. Must include the origin level and destination level.
- `enemyDetectDistancePx`: Pixel distance within which the escort detects enemies and crouches (knight-specific behavior)

**Entity Components**:
- `TransformComponent` — world position
- `SpriteComponent` — renders escort spritesheet, `Depth.enemy`
- `ShadowComponent` — shadow beneath entity
- `AnimationComponent` — animation playback
- `GridPositionComponent` — tracks grid cell
- `GridCollisionComponent` — wall avoidance (walk-through, no `GridCellBlocker`)
- `EscortComponent` — core escort state machine (dormant, following, crouching, walking-to-destination, completed)

**Tags**: `'escort'` — NOT `'enemy'`, NOT `'npc'`.

**No `CollisionComponent`**: Projectiles pass through the escort. The escort cannot be damaged.

**Acceptance Criteria**:
- `'escort'` added to `EntityType` union in `LevelLoader.ts`
- Entity factory creates escort with all listed components
- Escort does NOT block player or enemy movement (no `GridCellBlocker`)
- Escort does NOT interact with projectiles (no `CollisionComponent`)
- Escort has `GridCollisionComponent` for wall avoidance during pathfinding movement
- Supports `createOnAnyEvent` / `createOnAllEvents` / `suppressOnAnyFlag` (standard entity system)
- Levels without escorts load without errors
- Escort entity is NOT targetable by player auto-aim (no `'enemy'` tag)

---

## R2: Escort Lifecycle — Dormant State

**Purpose**: Before awakening, the escort exists in the level as a visible but inactive entity.

**Behavior**:
- Escort spawns immediately on level load (not event-driven creation — the entity is always present in its origin level)
- In dormant state, the escort displays the crouching animation's last frame (0-indexed frame 4 of the 5-frame Crouching animation, south-facing only)
- The escort does not move, does not react to enemies, and does not follow the player
- If the player leaves the level and returns before awakening, the escort remains dormant at its original position
- The escort checks the `current_escort` flag on spawn: if it matches this escort's ID, the escort skips dormant and enters the active (following) state. If `escort_{id}_completed` is `"true"`, the escort spawns in the completed pose instead.

**Acceptance Criteria**:
- Escort visible at spawn position showing crouched pose (last frame of Crouching animation)
- Escort does not move or react to anything while dormant
- Escort remains dormant across level re-entries until awakened
- Escort correctly resumes active state if `current_escort` flag matches on level load
- Escort correctly shows completed pose if `escort_{id}_completed` is `"true"` on level load

---

## R3: Escort Lifecycle — Awakening

**Purpose**: Transition the escort from dormant to active when the configured event fires.

**Behavior**:
- When the `awakeOnEvent` event fires, the escort transitions from dormant to active
- On awakening, the escort plays the Crouching animation in REVERSE (frames 4→0, south-facing) to stand up
- After the stand-up animation completes, the escort enters the following state
- On awakening, the world state flag `current_escort` is set to this escort's entity ID
- Only one escort can be active at a time (setting `current_escort` implicitly deactivates any previous escort)
- The escort listens for its `awakeOnEvent` via the existing `EventManagerSystem`

**Acceptance Criteria**:
- Escort transitions from crouched pose to standing via reverse crouch animation
- `current_escort` flag set to escort's entity ID on awakening
- Escort enters following state after stand-up animation completes
- If `awakeOnEvent` fires while escort is already active or completed, it is ignored
- Event listener is registered on entity spawn and cleaned up on entity destroy

---

## R4: Following Behavior

**Purpose**: Active escort follows the player using pathfinding.

**Behavior**:
- Escort follows the player at `followSpeed` pixels per second
- Escort stops when within 1 cell distance (~64px) of the player and plays idle animation
- Escort uses `Pathfinder` for navigation (4-direction movement for knight, matching its 4 walk directions)
- Path recalculates periodically (every 500–1000ms)
- Escort syncs its layer with the player's layer (handles stairs/layer transitions)
- If the escort is >800px from the player, it teleports to the player's position
- Escort plays the walk animation (`Scary_Walk` for knight) in the direction of movement
- Escort plays idle animation when stopped near the player
- When no valid path exists, the escort idles in place (does NOT move through walls)

**Acceptance Criteria**:
- Escort follows player smoothly using pathfinding
- Escort stops within ~1 cell of player
- Escort teleports if >800px away
- Escort handles layer transitions (stairs)
- Walk animation plays in correct direction during movement
- Idle animation plays when stopped
- Escort never clips through walls

---

## R5: Enemy Detection and Crouching (Knight-Specific)

**Purpose**: The knight crouches in fear when enemies are nearby.

**Behavior**:
- Each frame while active (following or walking to destination), the knight checks pixel distance to all entities tagged `'enemy'`
- If any enemy is within `enemyDetectDistancePx` pixels, the knight transitions to crouching state
- On entering crouch: plays the Crouching animation forward (frames 0→4, south-facing) and holds the last frame
- The knight remains crouched and stationary while any enemy is within detection range
- When all enemies leave the detection range: plays the Crouching animation in REVERSE (frames 4→0, south-facing) to stand back up
- After standing up, the knight resumes its previous behavior (following or walking to destination)
- Enemy detection uses simple pixel distance (`Math.hypot`), not path distance — enemies through walls are detected

**Acceptance Criteria**:
- Knight crouches when any `'enemy'`-tagged entity is within `enemyDetectDistancePx`
- Crouch animation plays forward on entering crouch state
- Knight holds last crouch frame while enemies are nearby
- Reverse crouch animation plays when enemies leave range
- Knight resumes following/destination-walking after standing up
- Detection works against all enemy types (skeletons, throwers, robots, pumas, bullet_dudes, bug_bases, bugs)

---

## R6: Destination Walking

**Purpose**: When the escort can reach its destination, it walks there instead of following the player.

**Behavior**:
- Each update while active, the escort checks:
  1. Is the current level the `destinationLevel`?
  2. Can the pathfinder find a path to `(destinationCol, destinationRow)`?
  3. Is the path length ≤ `reachDistance` cells?
- If all three conditions are true, the escort walks to the destination cell using pathfinding at `followSpeed`
- If the destination cell is blocked (wall, pushable, etc.), the escort walks to the nearest reachable cell adjacent to the destination
- While walking to destination, the knight still reacts to enemies (crouches if enemies nearby, resumes walking when clear)
- The escort fires event `{entityId}_reached_destination` when it arrives at the destination cell (or nearest reachable cell)

**Acceptance Criteria**:
- Escort walks to destination when in the correct level and within reach distance
- Escort uses pathfinding (not direct movement) to reach destination
- Escort handles blocked destination by stopping at nearest reachable cell
- `{entityId}_reached_destination` event fires on arrival
- Knight still crouches for enemies while walking to destination
- Destination check runs each update (handles dynamic changes like pushables moving)

---

## R7: Escort Completion

**Purpose**: When the escort reaches its destination, it plays a final animation and becomes permanently stationary.

**Behavior**:
- On reaching the destination cell, the escort plays the completion animation (`Arms_stretched` for knight — 5 frames, south-facing, played once) and holds the last frame
- After the animation completes:
  - World state flag `current_escort` is cleared (set to `""`)
  - World state flag `escort_{id}_completed` is set to `"true"`
  - World state flag `escort_{id}_completed_level` is set to the destination level name
  - World state flag `escort_{id}_completed_col` is set to the destination column
  - World state flag `escort_{id}_completed_row` is set to the destination row
- The escort no longer reacts to enemies, follows the player, or moves
- If the player leaves and re-enters the destination level, the escort spawns at the destination cell in the completed pose (last frame of `Arms_stretched`)

**Acceptance Criteria**:
- Completion animation plays once and holds last frame
- `current_escort` flag cleared after completion
- `escort_{id}_completed` and position flags set
- Escort is permanently stationary after completion
- Escort persists in completed pose across level re-entries
- Escort does not react to enemies or follow after completion

---

## R8: Cross-Level Following

**Purpose**: The escort follows the player across level transitions, appearing in allowed levels.

**Behavior**:
- When the player transitions to a new level, the game checks the `current_escort` flag
- If `current_escort` is set and the new level is in the escort's `followToLevels` array, the escort is dynamically spawned in the new level
- The escort spawns on the player's spawn cell, invisible
- As soon as the player moves off the spawn cell, the escort becomes visible at that cell (instant, no animation)
- The escort then enters the following state normally
- If the new level is NOT in `followToLevels`, the escort does not appear (but `current_escort` flag remains set — the escort reappears when the player enters an allowed level)
- The escort's full entity definition (escortType, destination, followSpeed, etc.) must be persisted in world state so it can be reconstructed in any level

**World State Persistence for Cross-Level Spawning**:
- `current_escort`: Entity ID of the active escort
- `escort_{id}_type`: Escort subtype (e.g., `"knight"`)
- `escort_{id}_origin_level`: Level where the escort was originally defined
- `escort_{id}_destination_level`: Target level name
- `escort_{id}_destination_col`: Target cell column
- `escort_{id}_destination_row`: Target cell row
- `escort_{id}_reach_distance`: Reach distance in cells
- `escort_{id}_follow_speed`: Follow speed in px/sec
- `escort_{id}_follow_to_levels`: Comma-separated list of level names
- `escort_{id}_enemy_detect_px`: Enemy detection distance in pixels

**Acceptance Criteria**:
- Escort appears in new level when `current_escort` is set and level is in `followToLevels`
- Escort spawns on player's spawn cell, becomes visible when player steps off
- Escort does NOT appear in levels not in `followToLevels`
- `current_escort` flag persists even when escort is not visible (player in non-allowed level)
- Escort can be fully reconstructed from world state flags (no dependency on origin level JSON)
- Escort follows normally after appearing in new level

---

## R9: Player Death Behavior

**Purpose**: Define escort behavior when the player dies.

**Behavior**:
- The death system restores the `levelEntrySnapshot` of world state, which was captured when the player entered the current level
- **Death on the escort's origin level**: The `levelEntrySnapshot` was taken before the escort was awakened (if awakened during this visit). The escort reverts to dormant at its original spawn position. If the escort was already active when the player entered the level, the snapshot includes `current_escort` set, so the escort resumes active state.
- **Death on other levels**: The `levelEntrySnapshot` includes `current_escort` set (it was set before entering this level). On reload, the escort does the standard cross-level spawn behavior (appears on player spawn cell, follows when player moves off).

**Acceptance Criteria**:
- Death rollback restores escort state correctly via `levelEntrySnapshot`
- On origin level: escort reverts to dormant if awakened during this visit
- On other levels: escort reappears via cross-level spawn mechanism
- No special death-handling code needed — standard `levelEntrySnapshot` rollback handles it

---

## R10: Knight Spritesheet and Animations

**Purpose**: Define the knight's visual representation.

**Spritesheet**: `public/assets/knight/knight_spritesheet.png`
- Frame size: 68×68 pixels
- 8 columns × 7 rows (544×476)

**Animations**:

| Animation | Frames | Directions | Style | Frame Duration |
|-----------|--------|------------|-------|----------------|
| Idle | 0–3 (one per direction) | east, north, south, west | `static` | N/A |
| Scary_Walk | 8 frames per direction | east (8–15), north (16–23), south (24–31), west (32–39) | `repeat` | 0.1s |
| Arms_stretched | 40–44 | south only | `once` | 0.1s |
| Crouching | 48–52 | south only | `once` | 0.1s |
| Crouching_reverse | 52–48 (reversed) | south only | `once` | 0.1s |

**Scale**: Configurable — default ~0.94 (68px sprite in 64px cell) or 1.0.

**Direction Mapping** (4-direction, matching pet rock pattern):

| Direction Enum | Knight Direction |
|----------------|-----------------|
| Right, DownRight | east |
| Up, UpRight, UpLeft | north |
| Down, DownLeft | south |
| Left | west |
| None | south |

**Acceptance Criteria**:
- Knight spritesheet registered in `AssetRegistry` as `'knight_spritesheet'`
- All animations created with correct frame ranges
- Walk animation plays in 4 directions
- Arms_stretched and Crouching are south-only
- Reverse crouch animation plays frames in reverse order
- Scale fits knight within grid cell

---

## R11: Editor Integration

**Purpose**: Support escort placement and editing in the standalone level editor.

### Entity Palette

Add `'escort'` to the entity palette as a placeable type.

### Default Values

```typescript
escort: { col, row, escortType: 'knight', destinationLevel: '', destinationCol: 0, destinationRow: 0, awakeOnEvent: '', reachDistance: 15, followSpeed: 200, followToLevels: [], enemyDetectDistancePx: 128 }
```

### Context Panel (EntityForm)

When an escort entity is selected, the context panel shows:

| Field | Control | Description |
|-------|---------|-------------|
| id | Read-only text | Entity ID |
| type | Read-only text | `"escort"` |
| col, row | Number inputs | Grid position → `bridge.moveEntity()` |
| escortType | Text input (or dropdown) | Escort subtype (e.g., `"knight"`) |
| destinationLevel | Text input | Target level name |
| destinationCol, destinationRow | Number inputs | Target cell position |
| awakeOnEvent | Text input | Event name that awakens the escort |
| reachDistance | Number input | Max path length to destination (cells) |
| followSpeed | Number input | Movement speed (px/sec) |
| followToLevels | Text input (comma-separated) | Levels where escort follows |
| enemyDetectDistancePx | Number input | Enemy detection range (pixels) |

### Canvas Label

Escort entities show `'ES'` label on the canvas.

### Serialization

`extractEntities()` in EditorBridge must include an extraction block for `'escort'` type that preserves all data fields from `existingLevelData`.

**Acceptance Criteria**:
- `'escort'` appears in entity palette
- Clicking escort in palette + clicking canvas places an escort entity
- Context panel shows all editable fields
- Entity serializes correctly in level JSON (round-trip save/load)
- `'ES'` label shown on canvas for escort entities
- `extractEntities()` correctly preserves escort data on save

---

## R12: Asset Registration

**Purpose**: Register knight assets so they load with the game.

**Assets**:
- `knight_spritesheet`: `public/assets/knight/knight_spritesheet.png` (68×68 frames)

**Registration**: Add to `AssetRegistry` in a new `knight` asset group (or `escort` group). Add to `AssetLoader.getRequiredAssetGroups()` so the spritesheet loads when an escort entity is present in the level.

**Acceptance Criteria**:
- `knight_spritesheet` registered in AssetRegistry with key `'knight_spritesheet'`, frameWidth 68, frameHeight 68
- Asset loads when a level contains an escort entity
- Asset available in editor mode

---

## Non-Requirements (Deferred)

- Multiple simultaneous escorts
- Escort combat abilities
- Escort health / damage
- Escort dialogue / speech boxes
- Escort-specific pathfinding avoidance of enemies
- Escort visual effects (glow, particles)
- Sound effects for escort animations
- Escort subtypes other than knight (future — architecture supports it)
- Configurable follow distance (hardcoded to ~1 cell)
- Configurable teleport distance (hardcoded to 800px)

---

## Files to Create

- `src/ecs/entities/escort/EscortEntity.ts` — Entity factory
- `src/ecs/components/escort/EscortComponent.ts` — Core escort state machine (dormant, following, crouching, walking-to-destination, completed)
- `src/ecs/entities/escort/KnightAnimations.ts` — Knight animation map creation

## Files to Modify

- `src/systems/level/LevelLoader.ts` — Add `'escort'` to `EntityType` union
- `src/systems/EntityLoader.ts` — Add escort case to entity creation switch
- `src/assets/AssetRegistry.ts` — Register `knight_spritesheet` asset
- `src/assets/AssetLoader.ts` — Add escort to `getRequiredAssetGroups()`
- `src/scenes/GameScene.ts` — Check `current_escort` flag on level load, dynamically spawn escort if needed
- `editor/EditorBridge.ts` — Add escort to entity defaults and `extractEntities()`
- `editor/panels/Toolbar.ts` — Add escort to `ENTITY_TYPES` array
- `editor/CanvasInteraction.ts` — Add `'ES'` label in `labelMap`
- `editor/panels/ContextPanel.ts` — Add escort-specific form fields

---

## Success Criteria

- Escort entity placeable in editor with all configurable fields
- Knight displays crouched pose when dormant
- Knight awakens on event with reverse-crouch stand-up animation
- Knight follows player using pathfinding at configurable speed
- Knight crouches when enemies are within detection range, stands up (reverse animation) when clear
- Knight walks to destination when in correct level and within reach distance
- Knight plays Arms_stretched animation on reaching destination, holds last frame permanently
- `current_escort` flag set on awakening, cleared on completion
- Escort follows player across levels listed in `followToLevels`
- Escort spawns on player's spawn cell in new levels, appears when player steps off
- Escort does NOT appear in levels not in `followToLevels`
- Completed escort persists in destination pose across level re-entries
- Player death correctly rolls back escort state via `levelEntrySnapshot`
- Escort pauses during interactions (standard entity pause behavior)
- Build and lint pass with zero errors
