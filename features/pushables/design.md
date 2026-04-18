# Pushable Objects — Design

## Architecture Overview

```
GameScene.initializeScene()
  ↓
EntityLoader.createEntityCreator('pushable')
  ↓
createPushableEntity()
  ├── TransformComponent (world position)
  ├── SpriteComponent (texture, Depth.breakable)
  ├── ShadowComponent
  ├── GridPositionComponent (collision box = full cell)
  ├── GridCollisionComponent (occupant registration)
  ├── GridCellBlocker (blocks player + enemy movement)
  ├── CollisionComponent (blocks all projectiles)
  └── PushableComponent (pushEnabled, doesPersist, spawnCol, spawnRow, layer)

Player interaction:
  GridCollisionComponent.canMoveTo()
    ↓ detects GridCellBlocker occupant
  GridCollisionComponent.update()
    ↓ blocked → checks if blocker has PushableComponent
  PlayerWalkState / PlayerIdleState
    ↓ cardinal direction + pushEnabled → enter push state
  PlayerPushState (new)
    ├── Phase 1: Contact (lean animation loop, icon swap)
    ├── Phase 2: Push (cell move at 100px/sec, destination validation)
    └── Phase 3: Release (disengage, revert icon)

Persistence:
  PushableComponent → WorldStateManager.getLevelState().movedEntities
  EntityLoader → reads movedEntities on spawn → overrides col/row

Pathfinding:
  GridCellBlocker on pushable → Grid.getCell().occupants
  Pathfinder.getValidNeighbor() already checks occupants → automatic

Projectiles:
  CollisionComponent { collidesWith: ['player_projectile', 'enemy_projectile'] }
  onHit → projectile.onWallHit() + projectile.destroy()
```

---

## PushableEntity Factory

Follows the `BreakableEntity` pattern exactly: same scaling logic, same `GridCellBlocker` + `CollisionComponent` setup, same `GridPositionComponent` with full-cell collision box.

```typescript
type CreatePushableProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  texture: string;
  pushEnabled: boolean;
  doesPersist: boolean;
  entityId: string;
  originalCol: number;  // always the JSON-defined position
  originalRow: number;
};

function createPushableEntity(props: CreatePushableProps): Entity {
  const entity = new Entity(props.entityId);
  entity.tags.add('pushable');

  const worldPos = props.grid.cellToWorld(props.col, props.row);
  const x = worldPos.x + props.grid.cellSize / 2;
  const y = worldPos.y + props.grid.cellSize / 2;

  // Scale texture to fit cell — same pattern as BreakableEntity
  const textureObj = props.scene.textures.get(props.texture);
  const frame = textureObj.get(0);
  const scale = props.grid.cellSize / Math.max(frame.width, frame.height);

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(props.scene, props.texture, transform));
  sprite.sprite.setDepth(Depth.breakable);

  entity.add(new ShadowComponent(props.scene, { scale: 1, offsetX: 0, offsetY: 0 }));

  const COLLISION_SIZE = props.grid.cellSize;
  entity.add(new GridPositionComponent(props.col, props.row, {
    offsetX: 0, offsetY: 0, width: COLLISION_SIZE, height: COLLISION_SIZE
  }));
  entity.add(new GridCollisionComponent(props.grid));
  entity.add(new GridCellBlocker());

  // Determine layer from spawn cell
  const spawnCell = props.grid.getCell(props.col, props.row);
  const layer = spawnCell ? props.grid.getLayer(spawnCell) : 0;

  entity.add(new PushableComponent({
    pushEnabled: props.pushEnabled,
    doesPersist: props.doesPersist,
    spawnCol: props.originalCol,   // (Fixed: runtime-analysis MINOR) always JSON position
    spawnRow: props.originalRow,
    layer,
  }));

  // Block ALL projectiles — tactical cover
  entity.add(new CollisionComponent({
    box: { offsetX: -COLLISION_SIZE / 2, offsetY: -COLLISION_SIZE / 2, width: COLLISION_SIZE, height: COLLISION_SIZE },
    collidesWith: ['player_projectile', 'enemy_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile') || other.tags.has('enemy_projectile')) {
        props.scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent, SpriteComponent, ShadowComponent,
    GridPositionComponent, GridCollisionComponent, GridCellBlocker,
    PushableComponent, CollisionComponent
  ]);

  return entity;
}
```

---

## PushableComponent Design

Stores push metadata and handles the cell-move mechanic when commanded by `PlayerPushState`.

```typescript
type PushableProps = {
  pushEnabled: boolean;
  doesPersist: boolean;
  spawnCol: number;
  spawnRow: number;
  layer: number;
};

class PushableComponent implements Component {
  entity!: Entity;
  readonly pushEnabled: boolean;
  readonly doesPersist: boolean;
  readonly spawnCol: number;
  readonly spawnRow: number;
  readonly layer: number;

  // Movement state — managed by PlayerPushState
  private isMoving = false;
  private moveStartX = 0;
  private moveStartY = 0;
  private moveTargetX = 0;
  private moveTargetY = 0;
  private moveProgress = 0;
  private moveSpeedPxPerSec = 100;
  private targetCol = 0;
  private targetRow = 0;
  private sourceCol = 0;
  private sourceRow = 0;

  constructor(props: PushableProps) { /* assign fields */ }

  getIsMoving(): boolean { return this.isMoving; }

  // Called by PlayerPushState to begin a one-cell move
  startMove(targetCol: number, targetRow: number, grid: Grid): void {
    const transform = this.entity.require(TransformComponent);
    this.sourceCol = grid.worldToCell(transform.x, transform.y).col;
    this.sourceRow = grid.worldToCell(transform.x, transform.y).row;
    this.targetCol = targetCol;
    this.targetRow = targetRow;
    this.moveStartX = transform.x;
    this.moveStartY = transform.y;
    const targetWorld = grid.cellToWorld(targetCol, targetRow);
    this.moveTargetX = targetWorld.x + grid.cellSize / 2;
    this.moveTargetY = targetWorld.y + grid.cellSize / 2;
    this.moveProgress = 0;
    this.isMoving = true;

    // (Fixed: runtime-analysis dual ownership) Disable GridCollisionComponent
    // during the move so it doesn't fight with our manual occupant management.
    // PushableComponent is the SOLE owner of grid occupants during moves.
    const gridCollision = this.entity.get(GridCollisionComponent);
    if (gridCollision) gridCollision.enabled = false;

    // Update grid occupant: remove from old cell, add to new cell
    grid.removeOccupant(this.sourceCol, this.sourceRow, this.entity);
    grid.addOccupant(targetCol, targetRow, this.entity);
  }

  update(delta: number): void {
    if (!this.isMoving) return;

    const transform = this.entity.require(TransformComponent);
    const totalDist = Math.hypot(
      this.moveTargetX - this.moveStartX,
      this.moveTargetY - this.moveStartY
    );
    this.moveProgress += (this.moveSpeedPxPerSec * delta / 1000) / totalDist;

    if (this.moveProgress >= 1) {
      this.moveProgress = 1;
      this.isMoving = false;

      // (Fixed: runtime-analysis dual ownership) Re-enable GridCollisionComponent
      // now that the move is complete and transform is at the target cell center.
      const gridCollision = this.entity.get(GridCollisionComponent);
      if (gridCollision) gridCollision.enabled = true;
    }

    transform.x = this.moveStartX + (this.moveTargetX - this.moveStartX) * this.moveProgress;
    transform.y = this.moveStartY + (this.moveTargetY - this.moveStartY) * this.moveProgress;
  }

  // Returns the current grid cell (target if moving, current if stationary)
  getCurrentCol(): number { return this.isMoving ? this.targetCol : this.sourceCol; }
  getCurrentRow(): number { return this.isMoving ? this.targetRow : this.sourceRow; }
}
```

**Key design decisions:**

1. **Grid occupant updated at move START, not end.** The pushable registers in the target cell immediately so nothing else can move into it during the animation. The source cell is freed immediately so the player can follow behind.

2. **Linear interpolation.** `moveProgress` goes 0→1 over the move duration. At 100px/sec with 64px cells, each move takes 640ms.

3. **PlayerPushState drives the move.** PushableComponent doesn't decide when to move — it only executes the interpolation. PlayerPushState calls `startMove()` after validating the destination.

4. **(Fixed: runtime-analysis) GridCollisionComponent disabled during moves.** PushableComponent is the SOLE owner of grid occupants during a move. GridCollisionComponent is disabled at move start and re-enabled at move end. This prevents dual occupant management where GridCollisionComponent would re-register the pushable in the source cell based on the interpolated transform position, conflicting with the atomic swap done by `startMove()`.

---

## Contact Detection Mechanism

### How GridCollisionComponent Detects Pushable Blockers

The existing `GridCollisionComponent.canMoveTo()` already checks cell occupants for `GridCellBlocker` and returns `false` when blocked. The collision resolution in `update()` then snaps the player back to `previousX/previousY`.

**The problem:** `canMoveTo()` returns a boolean — it doesn't report WHICH occupant blocked the player or in which direction.

**Solution:** Add a lightweight detection step in `PlayerWalkState` (not in GridCollisionComponent). After GridCollisionComponent runs and blocks the player, PlayerWalkState checks whether the blocking cell contains a pushable.

### Detection Flow

```
1. WalkComponent applies velocity → transform moves toward pushable
2. GridCollisionComponent.update() runs:
   2.1. checkCollision(newX, newY) → true (blocked by GridCellBlocker)
   2.2. Tries X-only and Y-only sliding
   2.3. Snaps player back to previousX/previousY on blocked axes
3. PlayerWalkState.onUpdate() runs (after GridCollisionComponent in update order):
   3.1. Read input delta (dx, dy) from InputComponent
   3.2. If input is purely cardinal (dx=0 or dy=0, not both non-zero):
        3.2.1. Calculate target cell = player cell + direction offset
        3.2.2. Check target cell occupants for entity with PushableComponent
        3.2.3. If found AND pushableComponent.pushEnabled:
               → Enter PlayerPushState with { pushable, direction }
```

### Cardinal Direction Check

```typescript
function getCardinalPushDirection(dx: number, dy: number): Direction | null {
  // Only pure cardinal input triggers contact — no diagonals
  if (dx !== 0 && dy !== 0) return null;
  if (dx > 0) return Direction.Right;
  if (dx < 0) return Direction.Left;
  if (dy > 0) return Direction.Down;
  if (dy < 0) return Direction.Up;
  return null;
}
```

### Target Cell Lookup

```typescript
const CARDINAL_OFFSETS: Record<Direction, { dc: number; dr: number }> = {
  [Direction.Up]:    { dc: 0, dr: -1 },
  [Direction.Down]:  { dc: 0, dr: 1 },
  [Direction.Left]:  { dc: -1, dr: 0 },
  [Direction.Right]: { dc: 1, dr: 0 },
};

// In PlayerWalkState.onUpdate():
const gridPos = entity.require(GridPositionComponent);
const offset = CARDINAL_OFFSETS[pushDir];
const targetCol = gridPos.currentCell.col + offset.dc;
const targetRow = gridPos.currentCell.row + offset.dr;
const targetCell = grid.getCell(targetCol, targetRow);

for (const occupant of targetCell.occupants) {
  const pushable = occupant.get(PushableComponent);
  if (pushable?.pushEnabled) {
    sm.stateMachine.enter('push', { pushableEntity: occupant, direction: pushDir });
    return;
  }
}
```

**Why detect in PlayerWalkState, not GridCollisionComponent:**
- GridCollisionComponent is a generic movement system — adding pushable-specific logic violates SRP
- PlayerWalkState already reads input and makes state transition decisions
- The detection only needs to run for the player entity, not all entities with GridCollisionComponent
- Keeps GridCollisionComponent unchanged — zero risk to existing collision behavior

---

## PlayerPushState Design

### State Data

```typescript
type PushStateData = {
  pushableEntity: Entity;
  direction: Direction; // Only Up, Down, Left, Right
};
```

### State Machine Registration

Added to the player's `StateMachine` in `PlayerEntity.ts`:

```typescript
const stateMachine = new StateMachine({
  idle: new PlayerIdleState(entity),
  walk: new PlayerWalkState(entity),
  death: new PlayerDeathState(entity, scene),
  push: new PlayerPushState(entity, grid),  // NEW
}, 'idle');
```

### Internal State

```typescript
class PlayerPushState implements IState {
  private pushableEntity!: Entity;
  private direction!: Direction;
  private phase: 'contact' | 'pushing' | 'completing' = 'contact';
  private playerMoveStartX = 0;
  private playerMoveStartY = 0;
  private playerMoveTargetX = 0;
  private playerMoveTargetY = 0;
  private damagePending = false;

  constructor(
    private readonly entity: Entity,
    private readonly grid: Grid
  ) {}
}
```

### Phase 1: Contact (Lean)

```
onEnter(data: PushStateData):
  1. Store pushableEntity and direction
  2. phase = 'contact'
  3. Snap player to center of adjacent cell (opposite of push direction)
  4. Play push_lean_${direction} animation (looping)
  5. Disable WalkComponent (walk.enabled = false)
  6. Swap HUD icon to 'push' via AttackButtonComponent.setIconOverride('push')
```

**Player snap position:**
```typescript
const pushable = pushableEntity.require(PushableComponent);
const pushableGridPos = pushableEntity.require(GridPositionComponent);
const offset = CARDINAL_OFFSETS[direction];
const playerCol = pushableGridPos.currentCell.col - offset.dc;
const playerRow = pushableGridPos.currentCell.row - offset.dr;
const playerWorld = grid.cellToWorld(playerCol, playerRow);
transform.x = playerWorld.x + grid.cellSize / 2;
transform.y = playerWorld.y + grid.cellSize / 2;
```

### Phase 1: Contact — onUpdate

```
onUpdate(delta):
  if phase === 'contact':
    1. Check joystick input → if any input detected, disengage()
    2. Check attack button → if pressed, tryPush()
    3. Check damage → if health decreased, disengage()
```

### Phase 2: Push — tryPush()

```
tryPush():
  1. Validate destination cell (see Destination Validation below)
  2. If blocked:
     2.1. Play push_${direction} animation (once) — player strains
     2.2. Do NOT move pushable
     2.3. When animation completes → return to 'contact' phase with lean anim
     2.4. Return
  3. If valid:
     3.1. phase = 'pushing'
     3.2. Play push_${direction} animation (once)
     3.3. Call pushableComponent.startMove(targetCol, targetRow, grid)
     3.4. Calculate player follow target (cell the pushable vacated)
     3.5. Store playerMoveStart and playerMoveTarget
     3.6. If doesPersist → update WorldState movedEntities
```

### Phase 2: Push — onUpdate (pushing)

```
onUpdate(delta) when phase === 'pushing':
  1. Interpolate player position toward target at same speed (100px/sec)
  2. Check if pushableComponent.getIsMoving() === false (move complete)
  3. If move complete:
     3.1. Snap player to cell center
     3.2. If damagePending → disengage()
     3.3. Else if attack button still held → tryPush() again (continuous push)
     3.4. Else → phase = 'contact', play lean animation
```

**Player follows at same speed as pushable:**
```typescript
// Player lerps in sync with pushable
const pushable = this.pushableEntity.require(PushableComponent);
// Use same progress ratio — both arrive simultaneously
const totalDist = Math.hypot(
  this.playerMoveTargetX - this.playerMoveStartX,
  this.playerMoveTargetY - this.playerMoveStartY
);
const movePx = 100 * (delta / 1000); // same speed as pushable
playerProgress += movePx / totalDist;
if (playerProgress >= 1) playerProgress = 1;
transform.x = this.playerMoveStartX + (this.playerMoveTargetX - this.playerMoveStartX) * playerProgress;
transform.y = this.playerMoveStartY + (this.playerMoveTargetY - this.playerMoveStartY) * playerProgress;
```

### Phase 3: Release — disengage()

```
disengage():
  1. If phase === 'pushing':
     1.1. Set damagePending = true (wait for move to complete)
     1.2. Return — onUpdate will call disengage() again when move finishes
  2. Transition to 'idle' state
     // Cleanup happens in onExit() — not here
```

### onExit() — Defensive Cleanup (Fixed: failure-analysis HIGH)

`onExit()` runs on ANY state exit, including forced transitions (death, future stun/freeze states) that bypass `disengage()`. The `StateMachine.enter()` method calls `onExit()` on the current state before entering the new one.

```typescript
onExit(): void {
  // Defensive cleanup — runs on ANY state exit, including forced transitions
  const walk = this.entity.require(WalkComponent);
  walk.setEnabled(true);
  const attackButton = joystick.get(AttackButtonComponent);
  attackButton?.setIconOverride(null);
  this.damagePending = false;
}
```

**Why onExit() instead of disengage():** `disengage()` handles the "wait for move to complete" logic during the pushing phase. But forced state transitions (e.g., `enter('death')` from `onHit`) bypass `disengage()` entirely. `onExit()` is the only guaranteed cleanup path because `StateMachine.enter()` always calls it.

### Damage Handling

The player's `CollisionComponent.onHit` already handles damage and can trigger death. During push state:

- **Contact phase:** Damage → immediate `disengage()` → normal damage handling continues
- **Pushing phase:** Damage → set `damagePending = true` → current cell move completes → then `disengage()`
- **This ensures neither player nor pushable is ever left between cells**

The `HealthComponent` processes damage independently of push state. `PlayerPushState` only needs to detect that health decreased (compare health each frame) or listen for the death state transition.

```typescript
// In onUpdate, check for damage:
const health = this.entity.require(HealthComponent);
if (health.getHealth() < this.lastKnownHealth) {
  this.lastKnownHealth = health.getHealth();
  if (this.phase === 'pushing') {
    this.damagePending = true; // Wait for move to finish
  } else {
    this.disengage();
  }
}
```

---

## Destination Validation

Called by `PlayerPushState.tryPush()` before each cell move. Returns `true` if the push is blocked.

```typescript
function isPushBlocked(
  targetCol: number, targetRow: number,
  pushableLayer: number,
  grid: Grid,
  blockedAreaManager?: BlockedAreaManager
): boolean {
  const cell = grid.getCell(targetCol, targetRow);

  // Out of bounds
  if (!cell) return true;

  // Wall or platform
  if (grid.isWall(cell) || cell.properties.has('platform')) return true;

  // Water without bridge
  if (cell.properties.has('water') && !cell.properties.has('bridge')) return true;

  // Stair/transition cell
  if (grid.isTransition(cell)) return true;

  // Different layer
  if (grid.getLayer(cell) !== pushableLayer) return true;

  // Blocked area polygon
  if (blockedAreaManager) {
    const cellKey = `${targetCol},${targetRow}`;
    if (blockedAreaManager.getBlockedCells().has(cellKey)) return true;
  }

  // Any entity with GridCellBlocker (another pushable, breakable, bug base, etc.)
  for (const occupant of cell.occupants) {
    if (occupant.get(GridCellBlocker)) return true;
  }

  return false;
}
```

**Key points:**
- Reuses existing `grid.isWall()`, `grid.isTransition()`, `grid.getLayer()` — same checks as `canMoveTo()` but simplified for single-cell pushable movement
- Checks `BlockedAreaManager.getBlockedCells()` for polygon overlap — same set used by Pathfinder
- No chain pushing: another pushable's `GridCellBlocker` blocks the destination

---

## Push Animation Splitting (Lean Loop vs Push Action)

### Existing Push Animations

PlayerEntity.ts already defines `push_${Direction}` for all 8 directions as `'once'` animations with 6 frames at 0.1s/frame (frames 224–271).

### New Lean Animations

Add `push_lean_${Direction}` for the 4 cardinal directions only. These use the first 3 frames of the corresponding push animation, looped:

```typescript
// In PlayerEntity.ts animation map setup — 4 cardinal directions only:
animMap.set(`push_lean_${Direction.Down}`, new Animation(['224', '225', '226'], 'repeat', 0.15));
animMap.set(`push_lean_${Direction.Right}`, new Animation(['236', '237', '238'], 'repeat', 0.15));
animMap.set(`push_lean_${Direction.Up}`, new Animation(['248', '249', '250'], 'repeat', 0.15));
animMap.set(`push_lean_${Direction.Left}`, new Animation(['260', '261', '262'], 'repeat', 0.15));
```

### Animation Usage by Phase

| Phase | Animation | Style | When |
|-------|-----------|-------|------|
| Contact | `push_lean_${dir}` | `repeat` (loop) | Player leaning against pushable |
| Push (valid) | `push_${dir}` | `once` | Player pushing, object moves |
| Push (blocked) | `push_${dir}` | `once` | Player strains, object stays |
| After push completes | `push_lean_${dir}` | `repeat` (loop) | Return to lean if button released |
| Disengage | `idle_${dir}` | `static` | Player walks away |

**Why 3 frames for lean:** The first 3 frames of the push animation show the player leaning into the object. Frames 4–6 show the exertion/follow-through. Looping frames 0–2 creates a natural "bracing" idle.

**Why 0.15s per frame for lean:** Slightly slower than the push animation (0.1s) to feel like a relaxed hold rather than active pushing.

---

## HUD Icon Swap Integration

### Current Pattern

`AttackButtonComponent.updateIcon()` checks `NPCManager.getClosestInteractableNPC()` each frame and swaps between `'punch'` and `'speech'` textures. The icon state is determined entirely by proximity to NPCs.

### Push Icon Integration

Add a third icon state `'push'` controlled by an **override** mechanism. PlayerPushState sets the override on enter and clears it on exit. The override takes priority over the NPC proximity check.

```typescript
// AttackButtonComponent additions:
private iconOverride: string | null = null;

setIconOverride(icon: string | null): void {
  this.iconOverride = icon;
}

private updateIcon(): void {
  // Override takes priority
  if (this.iconOverride === 'push') {
    if (this.currentIcon !== 'push') {
      this.currentIcon = 'push';
      this.sprite.setTexture('push_icon');
      this.sprite.setScale(UNPRESSED_SCALE);
      // Kill bounce tween if active
      if (this.bounceTween) { this.bounceTween.destroy(); this.bounceTween = null; }
    }
    return;
  }

  // Existing NPC proximity logic unchanged
  const closestNPC = npcManager.getClosestInteractableNPC(player);
  const newIcon = closestNPC ? 'speech' : 'punch';
  // ... existing swap logic ...
}
```

**Why override instead of a third proximity check:** Push state is a discrete player state, not a proximity condition. The override pattern is simpler and avoids coupling AttackButtonComponent to PushableComponent.

### PlayerPushState Integration

```typescript
// onEnter:
const attackButton = joystick.get(AttackButtonComponent);
attackButton?.setIconOverride('push');

// disengage():
attackButton?.setIconOverride(null); // Reverts to normal NPC/punch logic
```

---

## Persistence Design (movedEntities on LevelState)

### LevelState Type Change

```typescript
export type LevelState = {
  liveEntities: string[];
  destroyedEntities: string[];
  firedTriggers: string[];
  modifiedCells: Array<{ col: number; row: number; properties?: string[]; backgroundTexture?: string; layer?: number; }>;
  movedEntities: Array<{ id: string; col: number; row: number; }>;  // NEW
};
```

### WorldStateManager Changes

```typescript
// getLevelState() — initialize movedEntities if missing (backward compat):
getLevelState(levelName: string): LevelState {
  if (!this.worldState.levels[levelName]) {
    this.worldState.levels[levelName] = {
      liveEntities: [], destroyedEntities: [], firedTriggers: [],
      modifiedCells: [], movedEntities: []
    };
  }
  // Backward compat: ensure movedEntities exists on old saves
  this.worldState.levels[levelName].movedEntities ??= [];
  return this.worldState.levels[levelName];
}

// New method — called by PlayerPushState after each successful cell move:
updateMovedEntity(levelName: string, entityId: string, col: number, row: number): void {
  const levelState = this.getLevelState(levelName);
  const existing = levelState.movedEntities.find(e => e.id === entityId);
  if (existing) {
    existing.col = col;
    existing.row = row;
  } else {
    levelState.movedEntities.push({ id: entityId, col, row });
  }
}
```

### Save Flow (after each successful push)

```
PlayerPushState.onUpdate() detects move complete:
  if pushable.doesPersist:
    worldStateManager.updateMovedEntity(levelName, pushable.entity.id, targetCol, targetRow)
```

### Load Flow (EntityLoader)

```typescript
// In EntityLoader.createEntityCreator(), case 'pushable':
const movedEntry = levelState.movedEntities.find(e => e.id === entityDef.id);
const spawnCol = movedEntry?.col ?? (data.col as number);
const spawnRow = movedEntry?.row ?? (data.row as number);

// (Fixed: runtime-analysis MINOR) Pass original JSON col/row as spawnCol/spawnRow
// so PushableComponent always knows the original level-defined position.
// Use persisted col/row only for actual entity placement.
return () => createPushableEntity({
  scene: this.scene, col: spawnCol, row: spawnRow, grid: this.grid,
  texture: data.texture as string,
  pushEnabled: data.pushEnabled as boolean ?? true,
  doesPersist: data.doesPersist as boolean ?? false,
  entityId: entityDef.id,
  originalCol: data.col as number,  // always the JSON-defined position
  originalRow: data.row as number,
});
```

**Backward compatibility:** Old save files without `movedEntities` get an empty array via the `??= []` fallback. No migration needed.

---

## Pathfinding and Projectile Blocking

### Pathfinding — Automatic via GridCellBlocker

The pushable entity has `GridCellBlocker` and registers as a cell occupant via `GridCollisionComponent`. The existing `Pathfinder.getValidNeighbor()` already checks cell occupants for `GridCellBlocker`:

```
Pathfinder.getValidNeighbor(col, row):
  cell = grid.getCell(col, row)
  for occupant of cell.occupants:
    if occupant.get(GridCellBlocker) → return null (blocked)
```

**No Pathfinder changes needed.** Enemies automatically route around pushables because they're grid occupants with `GridCellBlocker`.

When a pushable moves, `PushableComponent.startMove()` updates occupants atomically:
1. `grid.removeOccupant(sourceCol, sourceRow, entity)` — old cell freed
2. `grid.addOccupant(targetCol, targetRow, entity)` — new cell blocked

Pathfinder queries always see the pushable in exactly one cell.

### Projectile Blocking — via CollisionComponent

The pushable's `CollisionComponent` has `collidesWith: ['player_projectile', 'enemy_projectile']`. The existing `CollisionSystem` checks AABB overlap between projectiles and pushables each frame.

On hit:
1. Projectile's `onWallHit` callback fires (visual effects like sparks)
2. Projectile is destroyed via `delayedCall(0, () => other.destroy())`
3. Pushable takes no damage (no BreakableComponent, no health)

**No CollisionSystem changes needed.** The existing system handles this via the `onHit` callback defined in the entity factory.

---

## Editor Integration Approach

### Entity Palette

Add `'pushable'` to the entity palette list in `editor/panels/EntityPalette.ts`. Follows the same pattern as all other entity types.

### EditorBridge Defaults

```typescript
// In EditorBridge.addEntity() defaults:
pushable: { col, row, texture: 'dungeon_vase', pushEnabled: true, doesPersist: false },
```

### EntityForm — Pushable-Specific Fields

When a pushable entity is selected, the context panel shows:

| Field | Control | Bridge Method |
|-------|---------|---------------|
| id | Read-only text | — |
| type | Read-only text | — |
| col, row | Number inputs | `bridge.moveEntity()` |
| texture | Texture picker (same as breakable) | `bridge.updateEntity(id, { texture })` |
| pushEnabled | Checkbox | `bridge.updateEntity(id, { pushEnabled })` |
| doesPersist | Checkbox | `bridge.updateEntity(id, { doesPersist })` |

The texture picker reuses the same pattern as the breakable entity's texture field — a clickable thumbnail that opens the texture browser.

### EntityLoader — Editor Mode

In editor mode (`isEditorMode: true`), pushables spawn at their JSON-defined positions (no persistence check). The editor doesn't read `movedEntities`.

### Serialization

`extractEntities()` in EditorBridge already handles generic entity serialization. Pushable data (`col`, `row`, `texture`, `pushEnabled`, `doesPersist`) is stored directly on the entity definition's `data` field — no special extraction logic needed.
