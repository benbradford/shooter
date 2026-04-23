# Escort Entity — Design

## Architecture Overview

```
GameScene.initializeScene()
  ↓
EntityLoader.createEntityCreator('escort')   ← origin level (entity in JSON)
  OR
GameScene.spawnCrossLevelEscort()            ← non-origin level (from world state flags)
  OR
GameScene.spawnCompletedEscorts()            ← completed escort on non-origin level
  ↓
createEscortEntity()
  ├── TransformComponent (world position)
  ├── SpriteComponent (escort spritesheet, Depth.enemy)
  ├── ShadowComponent (init() called explicitly)
  ├── AnimationComponent (AnimationSystem with escort animation map)
  ├── GridPositionComponent (tracks grid cell, collision box)
  ├── GridCollisionComponent (wall avoidance, NO GridCellBlocker)
  └── EscortComponent (monolithic state machine + follow + enemy detection)

Tags: 'escort' — NOT 'enemy', NOT 'npc'
No CollisionComponent — projectiles pass through
No GridCellBlocker — player/enemies walk through
```

**Key architectural decision:** `EscortComponent` is a single monolithic component that owns the state machine, following logic, enemy detection, and destination walking. This follows the `LaserBeamComponent` and `PushableComponent` pattern where a single component owns all behavior for its entity type.

**Why not use `StateMachineComponent` + `IState` classes (puma pattern)?** The puma pattern uses separate state class files because puma states are complex (resting FOV detection, chase momentum physics, jump arcs). The escort's states are simpler — mostly animation swaps and pathfinding toggles. A single component with an internal state enum is cleaner and avoids 7+ tiny state files.

---

## Data Flow

### Level Load — Origin Level (Entity in JSON)

```
1. LevelLoader.load() → LevelData with escort entity in entities array
2. GameScene.initializeScene() → spawnEntities()
3. EntityLoader case 'escort' → createEscortEntity()
   3.1. Read escortType, destination, awakeOnEvent, etc. from entity data
   3.2. Check WorldState flags:
        - If escort_{id}_completed === "true" → spawn in completed state
        - If current_escort === entityId → spawn in following state (skip dormant)
        - Otherwise → spawn in dormant state
   3.3. Register event listener for awakeOnEvent (only if dormant)
4. Entity added to EntityManager, updates each frame
```

### Level Load — Cross-Level Spawn (From World State Flags)

```
1. GameScene.spawnEntities() completes (normal entities loaded)
2. GameScene.spawnCrossLevelEscort() called:
   2.1. Read current_escort flag → entityId
   2.2. If empty or undefined → return (no active escort)
   2.3. Read escort_{id}_follow_to_levels flag → parse comma-separated list
   2.4. If current level NOT in list → return (escort doesn't appear here)
   2.5. Check if entity already exists in EntityManager (origin level has it in JSON)
        → If exists, skip (EntityLoader already created it)
   2.6. Read all escort_{id}_* flags to reconstruct entity definition
   2.7. Call createEscortEntity() with reconstructed data + state='waiting_for_player_move'
   2.8. Position at player spawn cell
   (Fixed V4, V5): Factory sets sprite+shadow alpha=0, initializes playerSpawnCol/Row
3. Each frame: EscortComponent checks if player has moved off spawn cell
   → When player moves: set visible, transition to 'following'
```

### Level Load — Completed Escort on Non-Origin Level (Fixed V7)

```
1. After spawnCrossLevelEscort(), GameScene.spawnCompletedEscorts() called:
   1.1. Iterate WorldState flags for escort_*_completed === "true"
   1.2. For each: check escort_{id}_completed_level === currentLevelName
   1.3. Skip if entity already exists in EntityManager (origin level has it)
   1.4. Read completed_col, completed_row from flags
   1.5. createEscortEntity() with initialState='completed' at completed position
```

### Awakening Flow

```
1. External system raises awakeOnEvent (trigger, Lua script, etc.)
2. EventManagerSystem delivers event to EscortComponent.onEvent()
3. EscortComponent:
   3.1. If state !== 'dormant' → ignore
   (Fixed F3): Check if current_escort already set → clear previous escort's flags
   3.2. Set state = 'awakening'
   3.3. Play Crouching_reverse animation (frames 52→48, south, once)
   3.4. Set WorldState flag: current_escort = entityId
   3.5. Persist escort definition to WorldState flags (for cross-level reconstruction)
   3.6. Deregister event listener (one-shot)
4. Each frame during 'awakening': check if animation is on last frame
   → When complete: transition to 'following'
```

### Following Flow

```
1. EscortComponent.update() in 'following' state:
   1.1. Check destination reachability (see Destination Check below)
   1.2. Check enemy proximity (knight-specific)
        → If enemy within range: transition to 'crouching'
   1.3. Calculate distance to player
        → If >800px: teleport to player position
        → If ≤64px (1 cell): play idle animation, stop moving
        → Otherwise: pathfind toward player, play walk animation
   1.4. Sync layer with player's layer
```

### Destination Check (runs each frame while following or walking-to-destination)

```
1. Is current level === destinationLevel?
   → No: continue following
2. Find path to (destinationCol, destinationRow) using Pathfinder
   → No path: try adjacent cells, use nearest reachable
3. Is path length ≤ reachDistance?
   → No: continue following
4. All conditions met → transition to 'walking_to_destination'
```

### Completion Flow (Fixed F1: flags set at START, not end)

```
1. EscortComponent arrives at destination cell (or nearest reachable)
2. Transition to 'completing' state
3. IMMEDIATELY set completion flags (before animation):
   3.1. Clear flag: current_escort = ""
   3.2. Set flags: escort_{id}_completed = "true"
   3.3. Set flags: escort_{id}_completed_level, _col, _row
4. Play Arms_stretched animation (frames 40→44, south, once)
5. Raise event: {entityId}_reached_destination
6. When animation completes: set state = 'completed' (cosmetic only — flags already set)
7. Escort permanently holds last frame, ignores all input
```

### Player Death Flow (Fixed V6: explicit reset, no levelEntrySnapshot dependency)

```
1. Player dies → reloadCurrentLevel() called
2. GameScene.handleEscortDeathReset() called BEFORE level reload:
   2.1. Read current_escort flag → escortId
   2.2. If empty → return
   2.3. Read escort_{id}_origin_level flag
   2.4. If origin_level === currentLevelName (died on origin level):
        → Clear current_escort flag
        → Clear all escort_{id}_* persisted definition flags
        → Escort will respawn dormant from level JSON on reload
   2.5. If origin_level !== currentLevelName (died on non-origin level):
        → Do nothing — current_escort stays set
        → Cross-level spawn recreates escort on reload
3. Level reloads normally — entities destroyed and recreated
```

---

## State Machine Design

### States and Transitions

```
              ┌──────────┐   awakeOnEvent    ┌────────────┐
              │ dormant  │ ────────────────→  │ awakening  │
              └──────────┘                    └─────┬──────┘
                                                    │ anim complete
                    ┌───────────────────────────────┘
                    ▼
              ┌──────────┐   enemy nearby    ┌────────────┐
              │following │ ←───────────────→ │ crouching  │
              └────┬─────┘   enemies gone    └────────────┘
                   │                               ↑   ↓
                   │ destination reachable         │   │
                   ▼                               │   │
              ┌──────────────────┐  enemy nearby   │   │
              │walking_to_dest   │ ←──────────────→┘   │
              └────────┬─────────┘  enemies gone       │
                       │ arrived                       │
                       ▼                               │
              ┌──────────────┐                         │
              │ completing   │  (flags already set)    │
              └──────┬───────┘                         │
                     │ anim complete                   │
                     ▼                                 │
              ┌──────────────┐                         │
              │  completed   │                         │
              └──────────────┘                         │

              ┌──────────────────────┐                 │
              │waiting_for_player_   │ player moves ──→│ following
              │move (cross-level)    │                 │
              └──────────────────────┘                 │

              On level load with current_escort matching:
              spawn directly into 'following' (origin) or
              'waiting_for_player_move' (cross-level)
              On level load with escort_completed:
              spawn directly into 'completed'
```

### State Enum

```typescript
type EscortState =
  | 'dormant'
  | 'awakening'
  | 'following'
  | 'crouching'
  | 'walking_to_destination'
  | 'completing'
  | 'completed'
  | 'waiting_for_player_move';
```

### Crouching Sub-States

```typescript
type CrouchPhase = 'crouching_down' | 'holding' | 'standing_up';
```

- `crouching_down`: Playing Crouching forward (0→4). On last frame → `holding`.
- `holding`: Holding last crouch frame. Each frame checks enemies. When clear → `standing_up`.
- `standing_up`: Playing Crouching_reverse (4→0). On last frame → return to `previousActiveState`.

The component stores `previousActiveState` when entering crouch so it knows where to resume.

---

## EscortComponent — Detailed Design

### File: `src/ecs/components/escort/EscortComponent.ts`

Single monolithic component. Implements `EventListener` for awakening event.

### Constructor and State

```typescript
class EscortComponent implements Component, EventListener {
  entity!: Entity;

  // Config (immutable)
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly playerEntity: Entity;
  private readonly entityManager: EntityManager;
  private readonly eventManager: EventManagerSystem;
  private readonly escortType: string;
  private readonly awakeOnEvent: string;
  private readonly destinationLevel: string;
  private readonly destinationCol: number;
  private readonly destinationRow: number;
  private readonly reachDistance: number;
  private readonly followSpeed: number;
  private readonly followToLevels: string[];
  private readonly enemyDetectDistancePx: number;
  private readonly currentLevelName: string;

  // State
  private state: EscortState;
  private crouchPhase: CrouchPhase = 'holding';
  private previousActiveState: 'following' | 'walking_to_destination' = 'following';

  // Pathfinding
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  private lastAnimKey = '';

  // Cross-level spawn tracking (Fixed V5: initialized from factory)
  private playerSpawnCol = -1;
  private playerSpawnRow = -1;

  // (Fixed V2): Track whether we registered the event listener
  private isEventRegistered = false;

  private static readonly PATH_RECALC_MS = 500;
  private static readonly TELEPORT_DISTANCE_PX = 800;
  private static readonly STOP_DISTANCE_PX = 64;

  constructor(props: EscortComponentProps) {
    // ... assign all fields from props ...
    this.state = props.initialState;

    // (Fixed V2, V5): Only register event listener when dormant
    if (this.state === 'dormant' && this.awakeOnEvent) {
      this.eventManager.register(this.awakeOnEvent, this);
      this.isEventRegistered = true;
    }

    // (Fixed V5): Initialize spawn tracking for cross-level
    if (this.state === 'waiting_for_player_move') {
      this.playerSpawnCol = props.col;
      this.playerSpawnRow = props.row;
    }
  }
}
```

### Event Listener — Awakening (Fixed F3: deactivate previous escort)

```typescript
onEvent(eventName: string): void {
  if (eventName !== this.awakeOnEvent) return;
  if (this.state !== 'dormant') return;

  // (Fixed F3): Deactivate any existing active escort
  const ws = WorldStateManager.getInstance();
  const previousEscortId = ws.getFlag('current_escort');
  if (previousEscortId && previousEscortId !== this.entity.id) {
    // Clear previous escort's persisted flags
    this.clearEscortFlags(previousEscortId);
    // Force previous escort entity to completed state if it exists in this scene
    const prev = this.entityManager.getAll().find(e => e.id === previousEscortId);
    const prevComp = prev?.get(EscortComponent);
    if (prevComp) prevComp.state = 'completed';
  }

  this.state = 'awakening';
  this.playAnim('crouch_reverse');

  ws.setFlag('current_escort', this.entity.id);
  this.persistEscortDefinition();

  // Deregister — one-shot
  this.eventManager.deregister(this.awakeOnEvent, this);
  this.isEventRegistered = false;
}
```

### Update — Main Loop

```typescript
update(delta: number): void {
  switch (this.state) {
    case 'dormant':
    case 'completed':
      return;
    case 'awakening':
      this.updateAwakening();
      return;
    case 'waiting_for_player_move':
      this.updateWaitingForPlayerMove();
      return;
    case 'following':
      if (this.checkEnemies()) return;
      if (this.checkDestinationReachable()) return;
      this.updateFollowing(delta);
      return;
    case 'crouching':
      this.updateCrouching(delta);
      return;
    case 'walking_to_destination':
      if (this.checkEnemies()) return;
      this.updateWalkingToDestination(delta);
      return;
    case 'completing':
      this.updateCompleting();
      return;
  }
}
```

### Cross-Level Spawn — Waiting for Player Move (Fixed V4, V5)

```typescript
private updateWaitingForPlayerMove(): void {
  const playerTransform = this.playerEntity.require(TransformComponent);
  const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

  if (playerCell.col !== this.playerSpawnCol || playerCell.row !== this.playerSpawnRow) {
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setAlpha(1);
    const shadow = this.entity.get(ShadowComponent);
    if (shadow?.shadow) shadow.shadow.setAlpha(1);
    this.state = 'following';
    this.playAnim(`idle_${this.currentDirection}`);
  }
}
```

### Completion — Flags at START (Fixed F1)

```typescript
private enterCompleting(): void {
  this.state = 'completing';

  // (Fixed F1): Set completion flags IMMEDIATELY, before animation.
  // If a level transition interrupts the animation, completion is already persisted.
  const ws = WorldStateManager.getInstance();
  ws.setFlag('current_escort', '');
  ws.setFlag(`escort_${this.entity.id}_completed`, 'true');
  ws.setFlag(`escort_${this.entity.id}_completed_level`, this.currentLevelName);
  ws.setFlag(`escort_${this.entity.id}_completed_col`, String(this.destinationCol));
  ws.setFlag(`escort_${this.entity.id}_completed_row`, String(this.destinationRow));

  this.playAnim('arms_stretched');
  this.eventManager.raiseEvent(`${this.entity.id}_reached_destination`);
}

private updateCompleting(): void {
  const anim = this.entity.require(AnimationComponent);
  if (anim.animationSystem.isOnLastFrame('arms_stretched')) {
    this.state = 'completed'; // Cosmetic — flags already set
  }
}
```

### Destination Walking (Fixed F2: fallback when path unreachable)

```typescript
private updateWalkingToDestination(delta: number): void {
  const transform = this.entity.require(TransformComponent);
  const destX = this.destinationCol * this.grid.cellSize + this.grid.cellSize / 2;
  const destY = this.destinationRow * this.grid.cellSize + this.grid.cellSize / 2;
  const distToDest = Math.hypot(destX - transform.x, destY - transform.y);

  // Arrived at destination
  if (distToDest < 8) {
    transform.x = destX;
    transform.y = destY;
    this.enterCompleting();
    return;
  }

  // Recalculate path periodically
  this.pathRecalcTimerMs += delta;
  if (!this.path || this.pathRecalcTimerMs >= EscortComponent.PATH_RECALC_MS) {
    this.recalculatePathToDestination();
    this.pathRecalcTimerMs = 0;
  }

  if (this.path && this.path.length > 0) {
    this.followPath(delta, transform);
  }
}

private recalculatePathToDestination(): void {
  const transform = this.entity.require(TransformComponent);
  const startCell = this.grid.worldToCell(transform.x, transform.y);
  const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());

  // Try exact destination
  this.path = pathfinder.findPath(
    startCell.col, startCell.row,
    this.destinationCol, this.destinationRow,
    0, false, true
  );

  // (Fixed F2): If blocked, try adjacent cells
  if (!this.path) {
    this.path = this.findPathToAdjacentCell(pathfinder, startCell);
  }

  // (Fixed F2): If completely unreachable, revert to following
  if (!this.path) {
    this.state = 'following';
    return;
  }

  this.currentPathIndex = 1;
}
```

### Enemy Detection, Following, Crouching, Pathfinding Helpers

```typescript
private checkEnemies(): boolean {
  if (this.escortType !== 'knight') return false;
  const transform = this.entity.require(TransformComponent);
  let enemyNearby = false;
  for (const enemy of this.entityManager.getAll()) {
    if (enemy.isDestroyed || !enemy.tags.has('enemy')) continue;
    const et = enemy.get(TransformComponent);
    if (!et) continue;
    if (Math.hypot(et.x - transform.x, et.y - transform.y) <= this.enemyDetectDistancePx) {
      enemyNearby = true;
      break;
    }
  }
  if (enemyNearby && this.state !== 'crouching') {
    this.previousActiveState = this.state as 'following' | 'walking_to_destination';
    this.state = 'crouching';
    this.crouchPhase = 'crouching_down';
    this.playAnim('crouch_forward');
    this.path = null;
    return true;
  }
  return false;
}

private updateCrouching(_delta: number): void {
  const anim = this.entity.require(AnimationComponent);
  if (this.crouchPhase === 'crouching_down') {
    if (anim.animationSystem.isOnLastFrame('crouch_forward')) this.crouchPhase = 'holding';
    return;
  }
  if (this.crouchPhase === 'holding') {
    if (!this.areEnemiesNearby()) {
      this.crouchPhase = 'standing_up';
      this.playAnim('crouch_reverse');
    }
    return;
  }
  if (this.crouchPhase === 'standing_up') {
    if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
      this.state = this.previousActiveState;
      this.playAnim(`idle_${this.currentDirection}`);
    }
  }
}

private updateFollowing(delta: number): void {
  const transform = this.entity.require(TransformComponent);
  const playerTransform = this.playerEntity.require(TransformComponent);

  // Sync layer with player
  const playerGridPos = this.playerEntity.get(GridPositionComponent);
  const escortGridPos = this.entity.get(GridPositionComponent);
  if (playerGridPos && escortGridPos) escortGridPos.currentLayer = playerGridPos.currentLayer;

  const dx = playerTransform.x - transform.x;
  const dy = playerTransform.y - transform.y;
  const dist = Math.hypot(dx, dy);

  if (dist > EscortComponent.TELEPORT_DISTANCE_PX) {
    transform.x = playerTransform.x;
    transform.y = playerTransform.y;
    this.path = null;
    this.playAnim(`idle_${this.currentDirection}`);
    return;
  }
  if (dist <= EscortComponent.STOP_DISTANCE_PX) {
    this.path = null;
    this.playAnim(`idle_${this.currentDirection}`);
    return;
  }

  this.pathRecalcTimerMs += delta;
  if (!this.path || this.pathRecalcTimerMs >= EscortComponent.PATH_RECALC_MS) {
    this.recalculatePathToPlayer();
    this.pathRecalcTimerMs = 0;
  }
  if (this.path && this.path.length > 0) {
    this.followPath(delta, transform);
  } else {
    this.playAnim(`idle_${this.currentDirection}`);
  }
}

private updateAwakening(): void {
  const anim = this.entity.require(AnimationComponent);
  if (anim.animationSystem.isOnLastFrame('crouch_reverse')) {
    this.state = 'following';
    this.playAnim(`idle_${this.currentDirection}`);
  }
}

private recalculatePathToPlayer(): void {
  const transform = this.entity.require(TransformComponent);
  const startCell = this.grid.worldToCell(transform.x, transform.y);
  const goalCell = this.grid.worldToCell(
    this.playerEntity.require(TransformComponent).x,
    this.playerEntity.require(TransformComponent).y
  );
  const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
  this.path = pathfinder.findPath(startCell.col, startCell.row, goalCell.col, goalCell.row, 0, false, true);
  this.currentPathIndex = 1;
}

private followPath(delta: number, transform: TransformComponent): void {
  if (!this.path || this.currentPathIndex >= this.path.length) { this.path = null; return; }
  const target = this.path[this.currentPathIndex];
  const targetX = target.col * this.grid.cellSize + this.grid.cellSize / 2;
  const targetY = target.row * this.grid.cellSize + this.grid.cellSize / 2;
  const dx = targetX - transform.x;
  const dy = targetY - transform.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) { this.currentPathIndex++; return; }
  const moveDist = this.followSpeed * (delta / 1000);
  if (moveDist >= dist) { transform.x = targetX; transform.y = targetY; }
  else { transform.x += (dx / dist) * moveDist; transform.y += (dy / dist) * moveDist; }
  const newDir = dirFromDelta(dx, dy);
  if (newDir !== Direction.None && newDir !== this.currentDirection) this.currentDirection = newDir;
  this.playAnim(`walk_${this.currentDirection}`);
}

private playAnim(key: string): void {
  if (key === this.lastAnimKey) return;
  this.lastAnimKey = key;
  this.entity.require(AnimationComponent).animationSystem.play(key);
}

private areEnemiesNearby(): boolean {
  const transform = this.entity.require(TransformComponent);
  for (const enemy of this.entityManager.getAll()) {
    if (enemy.isDestroyed || !enemy.tags.has('enemy')) continue;
    const et = enemy.get(TransformComponent);
    if (!et) continue;
    if (Math.hypot(et.x - transform.x, et.y - transform.y) <= this.enemyDetectDistancePx) return true;
  }
  return false;
}

private findPathToAdjacentCell(pathfinder: Pathfinder, startCell: { col: number; row: number }): Array<{ col: number; row: number }> | null {
  const offsets = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
  let bestPath: Array<{ col: number; row: number }> | null = null;
  for (const { dc, dr } of offsets) {
    const path = pathfinder.findPath(startCell.col, startCell.row, this.destinationCol + dc, this.destinationRow + dr, 0, false, true);
    if (path && (!bestPath || path.length < bestPath.length)) bestPath = path;
  }
  return bestPath;
}
```

### Cleanup (Fixed V2: always deregister)

```typescript
onDestroy(): void {
  // (Fixed V2): Always deregister if we registered, regardless of current state
  if (this.isEventRegistered) {
    this.eventManager.deregister(this.awakeOnEvent, this);
    this.isEventRegistered = false;
  }
}
```

### Helper: Clear Escort Flags

```typescript
private clearEscortFlags(escortId: string): void {
  const ws = WorldStateManager.getInstance();
  const keys = ['type', 'origin_level', 'destination_level', 'destination_col',
    'destination_row', 'reach_distance', 'follow_speed', 'follow_to_levels', 'enemy_detect_px'];
  for (const k of keys) ws.setFlag(`escort_${escortId}_${k}`, '');
}
```

---

## Knight Animation Map

### File: `src/ecs/entities/escort/KnightAnimations.ts`

### Direction Mapping (4-direction)

```typescript
const DIR_TO_KNIGHT: Record<Direction, string> = {
  [Direction.Right]: 'east',
  [Direction.DownRight]: 'east',
  [Direction.Up]: 'north',
  [Direction.UpRight]: 'north',
  [Direction.UpLeft]: 'north',
  [Direction.Down]: 'south',
  [Direction.DownLeft]: 'south',
  [Direction.Left]: 'west',
  [Direction.None]: 'south',
};
```

### Animation Definitions

```typescript
function createKnightAnimationMap(): Map<string, Animation> {
  const animMap = new Map<string, Animation>();

  const IDLE_FRAMES: Record<string, string[]> = {
    east: ['0'], north: ['1'], south: ['2'], west: ['3'],
  };
  const WALK_FRAMES: Record<string, string[]> = {
    east:  ['8','9','10','11','12','13','14','15'],
    north: ['16','17','18','19','20','21','22','23'],
    south: ['24','25','26','27','28','29','30','31'],
    west:  ['32','33','34','35','36','37','38','39'],
  };

  for (const dir of Object.values(Direction)) {
    if (typeof dir !== 'number') continue;
    const knightDir = DIR_TO_KNIGHT[dir as Direction];
    animMap.set(`idle_${dir}`, new Animation(IDLE_FRAMES[knightDir], 'static', 0.1));
    animMap.set(`walk_${dir}`, new Animation(WALK_FRAMES[knightDir], 'repeat', 0.1));
  }

  animMap.set('arms_stretched', new Animation(['40','41','42','43','44'], 'once', 0.1));
  animMap.set('crouch_forward', new Animation(['48','49','50','51','52'], 'once', 0.1));
  animMap.set('crouch_reverse', new Animation(['52','51','50','49','48'], 'once', 0.1));

  return animMap;
}
```

---

## World State Persistence Design

### Flags Used

| Flag | Set When | Cleared When | Purpose |
|------|----------|-------------|---------|
| `current_escort` | Escort awakens | Escort completes OR death on origin level | Active escort entity ID |
| `escort_{id}_type` | Escort awakens | Death on origin level | Subtype for cross-level reconstruction |
| `escort_{id}_origin_level` | Escort awakens | Death on origin level | Origin level name |
| `escort_{id}_destination_level` | Escort awakens | Death on origin level | Target level name |
| `escort_{id}_destination_col` | Escort awakens | Death on origin level | Target cell column |
| `escort_{id}_destination_row` | Escort awakens | Death on origin level | Target cell row |
| `escort_{id}_reach_distance` | Escort awakens | Death on origin level | Reach distance in cells |
| `escort_{id}_follow_speed` | Escort awakens | Death on origin level | Follow speed px/sec |
| `escort_{id}_follow_to_levels` | Escort awakens | Death on origin level | Comma-separated level list |
| `escort_{id}_enemy_detect_px` | Escort awakens | Death on origin level | Enemy detection distance |
| `escort_{id}_completed` | Escort completes | Never | Permanent completion marker |
| `escort_{id}_completed_level` | Escort completes | Never | Level where escort completed |
| `escort_{id}_completed_col` | Escort completes | Never | Completion cell column |
| `escort_{id}_completed_row` | Escort completes | Never | Completion cell row |

### persistEscortDefinition()

Called once when the escort awakens. Writes all entity data to WorldState flags so the escort can be reconstructed in any level.

```typescript
private persistEscortDefinition(): void {
  const ws = WorldStateManager.getInstance();
  const id = this.entity.id;
  ws.setFlag(`escort_${id}_type`, this.escortType);
  ws.setFlag(`escort_${id}_origin_level`, this.currentLevelName);
  ws.setFlag(`escort_${id}_destination_level`, this.destinationLevel);
  ws.setFlag(`escort_${id}_destination_col`, String(this.destinationCol));
  ws.setFlag(`escort_${id}_destination_row`, String(this.destinationRow));
  ws.setFlag(`escort_${id}_reach_distance`, String(this.reachDistance));
  ws.setFlag(`escort_${id}_follow_speed`, String(this.followSpeed));
  ws.setFlag(`escort_${id}_follow_to_levels`, this.followToLevels.join(','));
  ws.setFlag(`escort_${id}_enemy_detect_px`, String(this.enemyDetectDistancePx));
}
```

### Death Reset (Fixed V6: explicit, no levelEntrySnapshot dependency)

`levelEntrySnapshot` is declared but never assigned in the current codebase. Instead of relying on it, the escort uses explicit death-reset logic.

Called from `GameScene.reloadCurrentLevel()` BEFORE the level reload:

```typescript
// GameScene method
handleEscortDeathReset(): void {
  const ws = WorldStateManager.getInstance();
  const escortId = ws.getFlag('current_escort');
  if (!escortId) return;

  const originLevel = ws.getFlag(`escort_${escortId}_origin_level`);
  if (originLevel === this.currentLevelName) {
    // Died on origin level — revert escort to dormant
    ws.setFlag('current_escort', '');
    const keys = ['type', 'origin_level', 'destination_level', 'destination_col',
      'destination_row', 'reach_distance', 'follow_speed', 'follow_to_levels', 'enemy_detect_px'];
    for (const k of keys) ws.setFlag(`escort_${escortId}_${k}`, '');
  }
  // Died on non-origin level: current_escort stays set, cross-level spawn recreates escort
}
```

---

## Entity Factory Design

### File: `src/ecs/entities/escort/EscortEntity.ts`

```typescript
export function createEscortEntity(props: CreateEscortProps): Entity {
  const entity = new Entity(props.entityId);
  entity.tags.add('escort');

  const worldPos = props.grid.cellToWorld(props.col, props.row);
  const x = worldPos.x + props.grid.cellSize / 2;
  const y = worldPos.y + props.grid.cellSize / 2;

  const scale = props.grid.cellSize / 68; // 68px sprite in 64px cell

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(props.scene, 'knight_spritesheet', transform));
  sprite.sprite.setDepth(Depth.enemy);

  // (Fixed V1): Call shadow.init() explicitly after adding
  const shadow = entity.add(new ShadowComponent(props.scene, { scale: 1, offsetX: 0, offsetY: 0 }));
  shadow.init();

  // (Fixed V4): Set invisible for cross-level spawn
  if (props.initialState === 'waiting_for_player_move') {
    sprite.sprite.setAlpha(0);
    if (shadow.shadow) shadow.shadow.setAlpha(0);
  }

  entity.add(new GridPositionComponent(props.col, props.row, {
    offsetX: 0, offsetY: 0,
    width: props.grid.cellSize * 0.5,
    height: props.grid.cellSize * 0.5,
  }));
  entity.add(new GridCollisionComponent(props.grid));

  // Animation
  const animMap = createKnightAnimationMap();
  const defaultAnim = props.initialState === 'completed'
    ? 'arms_stretched' : `idle_${Direction.Down}`;
  const animSystem = new AnimationSystem(animMap, defaultAnim);
  entity.add(new AnimationComponent(animSystem, sprite));

  // For completed state, jump to last frame
  if (props.initialState === 'completed') {
    animSystem.play('arms_stretched');
    animMap.get('arms_stretched')?.setIndex(4);
  }

  // For dormant state, show last frame of crouch
  if (props.initialState === 'dormant') {
    animSystem.play('crouch_forward');
    animMap.get('crouch_forward')?.setIndex(4);
  }

  entity.add(new EscortComponent({
    scene: props.scene, grid: props.grid,
    playerEntity: props.playerEntity, entityManager: props.entityManager,
    eventManager: props.eventManager, escortType: props.escortType,
    awakeOnEvent: props.awakeOnEvent, destinationLevel: props.destinationLevel,
    destinationCol: props.destinationCol, destinationRow: props.destinationRow,
    reachDistance: props.reachDistance, followSpeed: props.followSpeed,
    followToLevels: props.followToLevels,
    enemyDetectDistancePx: props.enemyDetectDistancePx,
    initialState: props.initialState, currentLevelName: props.currentLevelName,
    col: props.col, row: props.row, // (Fixed V5): passed for spawn tracking
  }));

  entity.setUpdateOrder([
    TransformComponent, SpriteComponent, ShadowComponent,
    GridPositionComponent, GridCollisionComponent,
    EscortComponent, AnimationComponent,
  ]);

  return entity;
}
```

---

## Cross-Level Spawning Mechanism

### GameScene Integration

After `spawnEntities()` in `GameScene.initializeScene()`:

```typescript
if (!this.isEditorMode) {
  this.spawnCrossLevelEscort(player);
  this.spawnCompletedEscorts(player); // (Fixed V7)
}
```

### spawnCrossLevelEscort()

```typescript
private spawnCrossLevelEscort(player: Entity): void {
  const ws = WorldStateManager.getInstance();
  const escortId = ws.getFlag('current_escort');
  if (!escortId) return;

  // Check if escort already exists (origin level has it in JSON)
  if (this.entityManager.getAll().find(e => e.id === escortId)) return;

  const levelsStr = ws.getFlag(`escort_${escortId}_follow_to_levels`);
  if (!levelsStr) return;
  const allowedLevels = levelsStr.split(',');
  if (!allowedLevels.includes(this.currentLevelName)) return;

  // Reconstruct entity definition from world state flags
  const spawnCol = this.levelData.playerStart.x;
  const spawnRow = this.levelData.playerStart.y;

  const escort = createEscortEntity({
    scene: this, grid: this.grid, entityId: escortId,
    col: spawnCol, row: spawnRow, playerEntity: player,
    entityManager: this.entityManager, eventManager: this.eventManager,
    escortType: ws.getFlag(`escort_${escortId}_type`) ?? 'knight',
    awakeOnEvent: '',
    destinationLevel: ws.getFlag(`escort_${escortId}_destination_level`) ?? '',
    destinationCol: Number(ws.getFlag(`escort_${escortId}_destination_col`) ?? '0'),
    destinationRow: Number(ws.getFlag(`escort_${escortId}_destination_row`) ?? '0'),
    reachDistance: Number(ws.getFlag(`escort_${escortId}_reach_distance`) ?? '15'),
    followSpeed: Number(ws.getFlag(`escort_${escortId}_follow_speed`) ?? '200'),
    followToLevels: allowedLevels,
    enemyDetectDistancePx: Number(ws.getFlag(`escort_${escortId}_enemy_detect_px`) ?? '128'),
    initialState: 'waiting_for_player_move',
    currentLevelName: this.currentLevelName,
  });
  this.entityManager.add(escort);
}
```

### spawnCompletedEscorts() (Fixed V7)

Spawns completed escorts on non-origin levels where the escort finished its journey.

```typescript
private spawnCompletedEscorts(player: Entity): void {
  const ws = WorldStateManager.getInstance();
  const flags = ws.getState().flags;

  for (const [key, value] of Object.entries(flags)) {
    if (!key.endsWith('_completed') || value !== 'true') continue;
    if (!key.startsWith('escort_')) continue;

    // Extract escort ID: "escort_{id}_completed" → "{id}"
    const id = key.slice('escort_'.length, -'_completed'.length);

    const completedLevel = ws.getFlag(`escort_${id}_completed_level`);
    if (completedLevel !== this.currentLevelName) continue;

    // Skip if entity already exists (origin level has it in JSON)
    if (this.entityManager.getAll().find(e => e.id === id)) continue;

    const col = Number(ws.getFlag(`escort_${id}_completed_col`) ?? '0');
    const row = Number(ws.getFlag(`escort_${id}_completed_row`) ?? '0');
    const escortType = ws.getFlag(`escort_${id}_type`) ?? 'knight';

    const escort = createEscortEntity({
      scene: this, grid: this.grid, entityId: id,
      col, row, playerEntity: player,
      entityManager: this.entityManager, eventManager: this.eventManager,
      escortType, awakeOnEvent: '', destinationLevel: '', destinationCol: col,
      destinationRow: row, reachDistance: 0, followSpeed: 0, followToLevels: [],
      enemyDetectDistancePx: 0, initialState: 'completed',
      currentLevelName: this.currentLevelName,
    });
    this.entityManager.add(escort);
  }
}
```

### EntityLoader Integration

```typescript
// In EntityLoader.createEntityCreator(), add case:
case 'escort': {
  const ws = WorldStateManager.getInstance();
  let initialState: EscortState = 'dormant';
  if (ws.getFlag(`escort_${entityDef.id}_completed`) === 'true') {
    initialState = 'completed';
  } else if (ws.getFlag('current_escort') === entityDef.id) {
    initialState = 'following';
  }

  return () => createEscortEntity({
    scene: this.scene, grid: this.grid, entityId: entityDef.id,
    col: data.col, row: data.row, playerEntity: player,
    entityManager: this.entityManager, eventManager: this.eventManager,
    escortType: data.escortType ?? 'knight',
    awakeOnEvent: data.awakeOnEvent ?? '',
    destinationLevel: data.destinationLevel ?? '',
    destinationCol: data.destinationCol ?? 0,
    destinationRow: data.destinationRow ?? 0,
    reachDistance: data.reachDistance ?? 15,
    followSpeed: data.followSpeed ?? 200,
    followToLevels: data.followToLevels ?? [],
    enemyDetectDistancePx: data.enemyDetectDistancePx ?? 128,
    initialState,
    currentLevelName: this.currentLevelName,
  });
}
```

---

## Asset Loading (Fixed V3)

### AssetRegistry

```typescript
// In AssetRegistry.ts, add to ASSET_GROUPS:
escort: {
  knight_spritesheet: {
    path: 'knight/knight_spritesheet.png',
    frameWidth: 68,
    frameHeight: 68,
  },
},
```

### AssetLoader.getRequiredAssetGroups() (Fixed V3)

Check `current_escort` flag AND `escort_*_completed` flags to include escort assets even when no escort entity is in the level JSON. This prevents the knight_spritesheet from being unloaded before cross-level spawn.

```typescript
// In getRequiredAssetGroups():
if (levelData.entities?.some(e => e.type === 'escort')) {
  groups.push('escort');
}

// (Fixed V3): Also load escort assets for cross-level spawn or completed escorts
const ws = WorldStateManager.getInstance();
if (ws.getFlag('current_escort')) {
  if (!groups.includes('escort')) groups.push('escort');
}
// Check for completed escorts on this level
const flags = ws.getState().flags;
for (const [key, value] of Object.entries(flags)) {
  if (key.endsWith('_completed') && key.startsWith('escort_') && value === 'true') {
    if (!groups.includes('escort')) groups.push('escort');
    break;
  }
}
```

---

## AnimationSystem.isOnLastFrame() Helper

```typescript
// Add to AnimationSystem:
isOnLastFrame(animKey: string): boolean {
  if (this.currentKey !== animKey) return false;
  return this.current?.isOnLastFrame() ?? false;
}
```

---

## Editor Integration

### Entity Palette

Add `'escort'` to `ENTITY_TYPES` in `editor/panels/Toolbar.ts`.

### EditorBridge Defaults

```typescript
escort: {
  col, row, escortType: 'knight', destinationLevel: '', destinationCol: 0,
  destinationRow: 0, awakeOnEvent: '', reachDistance: 15, followSpeed: 200,
  followToLevels: [], enemyDetectDistancePx: 128,
},
```

### Canvas Label

```typescript
escort: 'ES',
```

### extractEntities() Block

```typescript
} else if (entity.tags?.has('escort')) {
  type = 'escort';
  const existing = existingLevelData.entities?.find(e => e.id === entity.id);
  data = { col: cell.col, row: cell.row, ...existing?.data };
}
```

### Context Panel — Escort Form Fields

When escort selected: escortType, destinationLevel, destinationCol, destinationRow, awakeOnEvent, reachDistance, followSpeed, followToLevels (comma-separated text), enemyDetectDistancePx.

---

## Files to Create

- `src/ecs/entities/escort/EscortEntity.ts` — Entity factory
- `src/ecs/components/escort/EscortComponent.ts` — Core escort state machine
- `src/ecs/entities/escort/KnightAnimations.ts` — Knight animation map creation

## Files to Modify

- `src/systems/level/LevelLoader.ts` — Add `'escort'` to `EntityType` union
- `src/systems/EntityLoader.ts` — Add escort case to entity creation switch
- `src/assets/AssetRegistry.ts` — Register `knight_spritesheet` asset
- `src/assets/AssetLoader.ts` — Add escort to `getRequiredAssetGroups()` with V3 fix
- `src/scenes/GameScene.ts` — Add `spawnCrossLevelEscort()`, `spawnCompletedEscorts()`, `handleEscortDeathReset()` methods
- `src/systems/animation/AnimationSystem.ts` — Add `isOnLastFrame(animKey)` helper
- `editor/EditorBridge.ts` — Add escort defaults and extraction block
- `editor/panels/Toolbar.ts` — Add `'escort'` to `ENTITY_TYPES`
- `editor/CanvasInteraction.ts` — Add `'ES'` label
- `editor/panels/ContextPanel.ts` — Add escort form fields
