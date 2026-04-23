# Laser Enemy — Requirements

## Overview

A stationary, indestructible laser emitter that fires a continuous beam in a fixed arbitrary-angle direction. The beam is a visual and gameplay hazard: it damages the player on contact (50 HP + knockback) and instantly kills any enemy in its path. The beam terminates at the first terrain blocker (wall, platform, pushable, breakable, blocked area, grid boundary). Lasers are toggled on/off via a world state flag, enabling puzzle integration with levers, triggers, and Lua scripts.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| Movement | Stationary — placed on a grid cell, never moves |
| Beam mode | Continuous — always on when active (no charge-up, no burst, no cycling) |
| Beam direction | Fixed arbitrary angle set in editor (degrees, not limited to 8 directions) |
| Beam termination | First terrain blocker: wall, platform, blocker, pushable, breakable, blocked area polygon, grid boundary |
| Beam pass-through | Passes through ALL entities (enemies, NPCs, pet, player) — only terrain stops it |
| Damage model | 50 HP per frame to player + 20px knockback; knockback pushes player out immediately |
| Knockback direction (moving) | Opposite of player's current movement direction |
| Knockback direction (stationary) | Random direction away from the beam line |
| Enemy damage | Instant kill — enemies die immediately on contact |
| Destructibility | Indestructible — cannot be damaged or destroyed |
| Toggle | World state flag (`{entity_id}_laser_on`); configurable flag name; defaults to ON if flag not set |
| Difficulty tiers | None |
| Warning indicator | None — laser is either on or off |
| Beam collision width | Same as visual outer glow: 8px (centered on beam line) |
| Beam rendering | 3-layer: inner core (white, 3px), outer glow (red, 8px, alpha 0.4), pulsing overlay |
| Impact effect | Animated spark particles at beam termination point |
| Base sprite | `laser_base.png` (exists at `public/assets/generic/laser_base.png`) |
| Base rotation | Sprite rotates to face beam direction |
| Base blocks movement | Yes — `GridCellBlocker` on the emitter cell |
| Base blocks projectiles | Yes — `CollisionComponent` absorbs projectiles |
| Base blocks pathfinding | Yes — automatic via `GridCellBlocker` |
| Layer behavior | Inherited from spawn cell; beam only interacts with same-layer terrain |
| Dynamic beam update | Every frame — beam recalculates endpoint each frame to handle moving pushables |
| Toggle visual | Instant appear/disappear (no fade or extend animation) |
| Flag poll frequency | Every frame |
| Max lasers per level | <10 expected; no spatial optimization needed |
| Entity lifecycle | Supports `createOnAnyEvent`, `createOnAllEvents`, `suppressOnAnyFlag` (standard entity system) |
| Pet interaction | Beam passes through pet (no damage, no collision — pet has no health) |
| Push state interaction | If pushable is between emitter and player, beam stops at pushable; if player is exposed, player takes damage normally |
| Multiple beams | Each laser is independent; player can take damage from multiple beams simultaneously |
| Beam hitting another laser base | Beam stops at the other laser's `GridCellBlocker` cell |
| Laser on transition cell | Not recommended; if placed, inherits cell layer |

---

## R1: Laser Entity Type Registration

**Purpose**: Register `laser` as a new entity type in the entity system.

**Level JSON Format**:
```json
{
  "id": "laser0",
  "type": "laser",
  "data": {
    "col": 10,
    "row": 5,
    "angle": 90,
    "flagName": "laser0_laser_on"
  }
}
```

**Properties**:
- `col`, `row`: Grid position of the emitter
- `angle`: Beam direction in degrees (0 = right, 90 = down, 180 = left, 270 = up). Supports arbitrary values 0–359.
- `flagName`: World state flag name that controls on/off (optional; defaults to `{entity_id}_laser_on`)

**Entity Components**:
- `TransformComponent` — world position (cell center)
- `SpriteComponent` — renders `laser_base.png`, rotated to face beam direction, `Depth.breakable`
- `GridPositionComponent` — tracks grid cell, collision box = full cell size
- `GridCollisionComponent` — occupant registration
- `GridCellBlocker` — blocks player and enemy movement into the emitter cell
- `CollisionComponent` — absorbs all projectiles (`collidesWith: ['player_projectile', 'enemy_projectile']`); on hit, projectile destroyed (no damage to laser)
- `LaserBeamComponent` — manages beam raycasting, rendering, collision detection, damage, and toggle state

**Layer**: Inherited from the cell the laser is placed on at spawn time. Does not change.

**Tags**: `'laser'` — NOT `'enemy'` (indestructible, should not be an auto-aim target).

**Acceptance Criteria**:
- `'laser'` added to `EntityType` union in `LevelLoader.ts`
- Entity factory creates laser with all listed components
- Base sprite scaled to fit cell size, rotated to match `angle`
- Blocks player movement (`GridCellBlocker`)
- Blocks enemy pathfinding (automatic via `GridCellBlocker` occupant)
- Absorbs all projectiles — both `player_projectile` and `enemy_projectile` tags; projectile destroyed on contact, no damage to laser
- Supports `createOnAnyEvent` / `createOnAllEvents` / `suppressOnAnyFlag` (existing entity system)
- Levels without lasers load without errors
- Laser entity is NOT targetable by player auto-aim

---

## R2: Beam Raycasting

**Purpose**: Each frame, calculate the beam's endpoint by raycasting from the emitter along the beam angle until hitting a terrain blocker or the grid boundary.

**Ray Origin**: Center of the emitter's grid cell (world coordinates).

**Ray Direction**: Unit vector derived from the `angle` property (degrees → radians).

**Termination Conditions** (beam stops at the first one hit):
1. **Wall cell** — `grid.isWall(cell)` returns true
2. **Platform cell** — `cell.properties.has('platform')`
3. **Blocked cell** — `cell.properties.has('blocked')`
4. **Pushable entity** — cell occupant has `GridCellBlocker` (catches pushables, breakables, bug bases, other laser bases, etc.)
5. **Blocked area polygon** — `blockedAreaManager.getBlockedCells().has("col,row")`
6. **Grid boundary** — ray exits the grid bounds (col < 0, col >= width, row < 0, row >= height)

**Layer Matching**: The beam only checks cells and occupants on the same layer as the laser entity. Cells on different layers are transparent to the beam.

**Step Method**: Step along the ray in small increments (e.g., 4px or half-cell steps), converting each point to grid coordinates and checking termination conditions. The endpoint is the world-pixel position where the first blocker is encountered.

**Update Frequency**: Every frame. The beam endpoint must update dynamically when pushables move, breakables are destroyed, or other blockers change.

**Acceptance Criteria**:
- Beam terminates at walls, platforms, blocked cells, pushables, breakables, bug bases, other laser bases, and blocked area polygons
- Beam terminates at grid boundary if no blocker is hit
- Beam only checks blockers on the same layer as the laser
- Beam endpoint updates every frame (handles moving pushables, destroyed breakables)
- Beam passes through all entities (enemies, NPCs, player, pet) — entities do NOT terminate the beam
- Raycast starts from emitter cell center, not from the edge of the cell

---

## R3: Beam Rendering (3-Layer Visual)

**Purpose**: Render the beam as a visually striking 3-layer line from the emitter to the calculated endpoint.

**Layer 1 — Outer Glow**:
- Color: Red (`0xff0000`)
- Width: 8px
- Alpha: 0.4
- Drawn first (behind other layers)

**Layer 2 — Inner Core**:
- Color: White/light yellow (`0xffffcc`)
- Width: 3px
- Alpha: 1.0
- Drawn on top of outer glow

**Layer 3 — Pulsing Energy Overlay**:
- Color: Red-orange (`0xff4400`)
- Width: Oscillates between 4px and 6px using a sine wave (period ~500ms)
- Alpha: Oscillates between 0.15 and 0.35
- Creates a "living energy" effect

**Rendering Technology**: Phaser `Graphics` object, redrawn each frame. The Graphics object is owned by the `LaserBeamComponent` and destroyed with the entity.

**Depth**: Rendered at `Depth.effects` (above floor/entities, below HUD).

**Diagonal Beams**: All three layers use the same start/end points. Lines are drawn with `graphics.lineBetween()` which handles arbitrary angles natively. No special diagonal handling needed.

**Toggle Visibility**: When the laser is off (flag = `"false"`), all beam graphics are hidden. When on, they are shown. Transition is instant (no fade).

**Acceptance Criteria**:
- Beam renders as 3 distinct visual layers from emitter to endpoint
- Outer glow is red, 8px wide, semi-transparent
- Inner core is white/yellow, 3px wide, fully opaque
- Pulsing overlay oscillates width and alpha smoothly
- Beam renders correctly at any arbitrary angle (not just cardinal/diagonal)
- Beam is hidden when laser is toggled off
- Beam is shown when laser is toggled on
- Graphics object is properly destroyed when entity is destroyed
- No visual artifacts when beam endpoint changes (e.g., pushable moves)

---

## R4: Beam Collision and Damage

**Purpose**: The beam damages the player and kills enemies that overlap with it.

### Player Damage

**Detection**: Each frame, check if the player's grid collision box (AABB) overlaps with the beam line (treated as a rectangle of width 8px centered on the beam line, from emitter to endpoint).

**Damage**: 50 HP per frame via `HealthComponent.takeDamage(50)`.

**Knockback**: 20px force via `KnockbackComponent.applyKnockback()`.
- If the player is moving: knockback direction is opposite of the player's current movement direction (normalized).
- If the player is stationary: knockback direction is a random unit vector pointing away from the beam line (perpendicular, toward the side the player is on).

**Hit Flash**: Trigger `HitFlashComponent.flash(300)` on damage.

**Death Check**: After damage, check `health.getHealth() <= 0` and enter death state if true.

**Continuous Damage**: The beam deals damage every frame the player overlaps. The knockback is designed to push the player out of the beam within 1–2 frames. There is no damage cooldown or invincibility window — the knockback IS the mitigation.

**Push State**: If the player is in `PlayerPushState` and the beam hits them, they take damage normally. The `damagePending` mechanism in `PlayerPushState` handles mid-push damage (current move completes, then disengage). If a pushable is between the emitter and the player, the beam stops at the pushable (R2 termination rules).

### Enemy Damage

**Detection**: Each frame, check all entities with the `'enemy'` tag. For each enemy, check if its `TransformComponent` position (center point) is within 8px of the beam line segment.

**Damage**: Instant kill. Call `entity.destroy()` on any enemy whose center point overlaps the beam.

**Pass-Through**: The beam passes through enemies — killing one enemy does NOT stop the beam. All enemies in the beam path are killed simultaneously.

**Excluded Entities**: Entities with `'laser'` tag are excluded from beam damage (a laser cannot kill another laser). Bug bases (`'bugbase'` type) ARE killed by the beam.

### Pet and NPC

**Pet**: Beam passes through the pet. No damage, no collision. Pet has no health system.

**NPC**: Beam passes through NPCs. No damage, no collision.

**Acceptance Criteria**:
- Player takes 50 damage per frame while overlapping the beam
- Player receives 20px knockback on each damage tick
- Knockback direction is opposite of movement (or random away from beam if stationary)
- HitFlashComponent triggers on damage
- Player death state entered when health reaches 0
- All enemies in the beam path are killed instantly each frame
- Beam passes through enemies (does not terminate at enemies)
- Beam passes through pet and NPCs without effect
- Laser entities are excluded from beam damage
- Damage only applies when the laser is toggled ON
- Player in push state takes damage normally (pushable blocks beam if between emitter and player)

---

## R5: World State Toggle

**Purpose**: Control laser on/off state via a world state flag, enabling puzzle integration.

**Flag Name**: Configurable per entity. Defaults to `{entity_id}_laser_on` (e.g., `laser0_laser_on`).

**Flag Semantics**:
- Flag value `"true"` → laser is ON (beam visible, damage active)
- Flag value `"false"` → laser is OFF (beam hidden, no damage)
- Flag not set (undefined) → laser defaults to ON

**Poll Frequency**: Every frame in `LaserBeamComponent.update()`. Read the flag from `WorldStateManager.getInstance().getState().flags[flagName]`.

**Toggle Behavior**: Instant. When the flag changes:
- OFF → ON: Beam graphics immediately shown, damage immediately active
- ON → OFF: Beam graphics immediately hidden, damage immediately inactive

**Flag Sources**: The laser does not care what sets the flag. Any system that modifies world state flags can toggle the laser:
- Lever entities (lever hit → event → eventchainer → sets flag)
- Trigger entities
- Lua interaction scripts (`setFlag(...)`)
- Any future system that writes world state flags

**Persistence**: The flag persists in `WorldState` across level transitions and save/load, following standard world state behavior.

**Acceptance Criteria**:
- Laser reads its flag name from entity data (defaults to `{entity_id}_laser_on`)
- Laser is ON when flag is `"true"` or not set
- Laser is OFF when flag is `"false"`
- Flag is checked every frame
- Toggle is instant (no animation)
- Beam graphics hidden when off; shown when on
- Damage inactive when off; active when on
- Flag can be set by any system (levers, triggers, Lua scripts)
- Flag persists across level transitions via standard WorldState

---

## R6: Editor Integration

**Purpose**: Support laser placement and editing in the standalone level editor.

### Entity Palette

Add `'laser'` to the entity palette as a placeable type.

### Default Values

```typescript
laser: { col, row, angle: 0, flagName: `${newId}_laser_on` }
```

### Context Panel (EntityForm)

When a laser entity is selected, the context panel shows:

| Field | Control | Description |
|-------|---------|-------------|
| id | Read-only text | Entity ID |
| type | Read-only text | `"laser"` |
| col, row | Number inputs | Grid position → `bridge.moveEntity()` |
| angle | Number input (0–359) | Beam direction in degrees → `bridge.updateEntity(id, { angle })` |
| flagName | Text input | World state flag name → `bridge.updateEntity(id, { flagName })` |

### Beam Preview

When a laser entity is selected in the editor, render a preview line on the canvas showing the beam direction and approximate length (raycast to nearest wall). This helps level designers visualize beam coverage.

- Preview line: thin dashed line from emitter center in the beam direction
- Terminates at the first wall/platform/blocker cell (same rules as R2, but simplified — no occupant check needed in editor since entities are paused)
- Color: semi-transparent red
- Only shown when the laser entity is selected

### EditorBridge Defaults

Add laser to the entity defaults in `EditorBridge.addEntity()`.

### Serialization

`extractEntities()` in EditorBridge already handles generic entity serialization. Laser data (`col`, `row`, `angle`, `flagName`) is stored on the entity definition's `data` field — no special extraction logic needed.

**Acceptance Criteria**:
- `'laser'` appears in entity palette
- Clicking laser in palette + clicking canvas places a laser entity
- Context panel shows angle (number input) and flagName (text input)
- Angle input accepts 0–359
- Beam preview line shown on canvas when laser is selected
- Entity serializes correctly in level JSON (round-trip save/load)
- Default angle is 0 (beam points right)
- Default flagName is `{entity_id}_laser_on`

---

## R7: Impact Particles at Beam Endpoint

**Purpose**: Render animated spark/energy particles at the point where the beam terminates.

**Visual Design**:
- Small flickering sparks (2–4px) at the beam endpoint
- Color: bright yellow core (`0xffff00`), fading to orange/red (`0xff6600`)
- 4–8 particles active at any time
- Each particle: short lifetime (100–300ms), slight outward motion from the impact point (perpendicular to beam direction, both sides), random velocity
- Particles are continuously emitted while the beam is active

**Rendering**: Phaser particle emitter OR manually managed sprite pool. The particle system is owned by `LaserBeamComponent` and destroyed with the entity.

**Position**: Particles spawn at the beam endpoint (the termination point calculated in R2). When the endpoint moves (e.g., pushable moves), particles immediately follow.

**Toggle**: Particles are only active when the laser is ON. Hidden when OFF.

**Acceptance Criteria**:
- Sparks visible at beam termination point
- Sparks are yellow/orange, 2–4px, short-lived
- Sparks move slightly outward from impact point
- Sparks continuously emit while beam is active
- Sparks follow the beam endpoint when it moves
- Sparks hidden when laser is toggled off
- Particle system properly destroyed when entity is destroyed
- No particle leak (particles don't accumulate indefinitely)

---

## R8: Asset Registration

**Purpose**: Register the laser base sprite in AssetRegistry so it loads with the game.

**Asset**: `public/assets/generic/laser_base.png` (already exists).

**Registration**: Add to AssetRegistry in the generic/core asset group, following the same pattern as other generic assets.

**Acceptance Criteria**:
- `laser_base` registered in AssetRegistry with key `'laser_base'`
- Loaded as part of the generic/core asset group
- Available for use by the laser entity factory and editor

---

## Non-Requirements (Deferred)

- Sweeping/rotating beams
- Tracking beams (follow player)
- Charge-up or burst patterns
- Beam color configuration per entity
- Beam width configuration per entity
- Beam damage configuration per entity
- Sound effects
- Warning telegraph before activation
- Beam reflection off mirrors/surfaces
- Chain lasers (one laser activating another)
- Destructible laser emitters
- Difficulty tiers
- Fade/extend animation on toggle

---

## Files to Create

- `src/ecs/entities/laser/LaserEntity.ts` — Entity factory
- `src/ecs/components/laser/LaserBeamComponent.ts` — Beam raycasting, rendering, collision, damage, toggle

## Files to Modify

- `src/systems/level/LevelLoader.ts` — Add `'laser'` to `EntityType` union
- `src/systems/EntityLoader.ts` — Add laser case to entity creation switch
- `src/assets/AssetRegistry.ts` — Register `laser_base` asset
- `editor/EditorBridge.ts` — Add laser to entity defaults
- `editor/panels/EntityPalette.ts` — Add laser to palette
- `editor/panels/EntityForm.ts` — Add laser-specific fields (angle, flagName)

---

## Success Criteria

- Laser entity placeable in editor with angle and flag name
- Beam renders as 3-layer visual from emitter to first terrain blocker
- Beam updates dynamically every frame (handles moving pushables, destroyed breakables)
- Player takes 50 damage per frame + 20px knockback while in beam
- Knockback pushes player out of beam within 1–2 frames
- All enemies in beam path are instantly killed
- Beam passes through all entities (only terrain stops it)
- Laser toggled on/off via world state flag (works with levers, triggers, Lua)
- Laser defaults to ON if flag not set
- Impact particles render at beam endpoint
- Laser base blocks movement, pathfinding, and projectiles
- Editor shows beam preview when laser is selected
- Build and lint pass with zero errors
