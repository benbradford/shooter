# Spawner Entities Guide

This guide covers creating entities that spawn other entities, including the event-driven spawner system.

## Overview

There are two types of spawner systems:

1. **Proximity spawners** - Spawn when player is nearby (bug bases)
2. **Event-driven spawners** - Spawn when an event is triggered (enemy spawner system)

This guide focuses on the event-driven spawner system used for spawning enemies by ID.

## Event-Driven Spawner System

### Architecture

**Components:**
- `EnemySpawnComponent` - Listens for events, spawns enemies by ID with delay
- `EnemySpawnerEntity` - Entity factory for spawners (no position, just logic)
- `TriggerComponent` - Raises events when player enters trigger cells

**Level Data:**
```typescript
type LevelSpawner = {
  eventName: string;      // Event to listen for
  enemyIds: string[];     // IDs of enemies to spawn
  spawnDelayMs: number;   // Delay between spawns
}

type LevelThrower = {
  id?: string;            // Optional - if present, spawned by spawner
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### How It Works

1. **Level loads** - Enemies with IDs are NOT spawned at start (skipped in game mode)
2. **Player triggers event** - Walks into trigger zone, event is raised
3. **Spawner receives event** - `EnemySpawnComponent.onEvent()` called
4. **Enemies spawn** - Spawner creates enemies one by one with delay
5. **Spawner destroys** - After all enemies spawned, spawner entity is destroyed

### Creating a Spawner

```typescript
const spawner = createEnemySpawnerEntity({
  eventManager: this.eventManager,
  eventName: 'spawn_wave_1',
  enemyIds: ['th1', 'th2', 'th3'],
  spawnDelayMs: 1000,
  onSpawnEnemy: (enemyId: string) => {
    // Find enemy data by ID
    const enemyData = level.throwers?.find(t => t.id === enemyId);
    if (enemyData) {
      // Create and add enemy entity
      const enemy = createThrowerEntity({ ... });
      this.entityManager.add(enemy);
    }
  }
});
```

### Editor Integration

**Placing Enemies:**
1. Press E → Add → Thrower
2. Click to place thrower
3. Click thrower to edit
4. Assign ID (e.g., "th1")
5. Save level

**Creating Spawner:**
1. Press E → Spawner
2. Enter event name (e.g., "spawn_wave_1")
3. Enter enemy IDs (comma-separated: "th1, th2, th3")
4. Set spawn delay (milliseconds)
5. Click Add Spawner

**Creating Trigger:**
1. Press E → Trigger
2. Enter event name (must match spawner: "spawn_wave_1")
3. Click cells to select trigger area
4. Check "One-shot trigger" (fires once and destroys)
5. Click Add Trigger

### Critical: Editor Mode vs Game Mode

**Problem:** Enemies with IDs need to be visible in editor but not spawn at game start.

**Solution:** Use `isEditorMode` flag:

```typescript
// In GameScene
private isEditorMode: boolean = false;

// When entering editor
editorKey.on('down', () => {
  this.isEditorMode = true;
  this.resetScene();  // Respawn all entities
  this.scene.pause();
  this.scene.launch('EditorScene');
});

// When spawning enemies
if (!this.isEditorMode && enemyData.id) {
  continue;  // Skip enemies with IDs in game mode
}
```

**Why this works:**
- Editor mode: All enemies spawn (including ID'd ones) so you can see/edit them
- Game mode: Only enemies without IDs spawn at start
- ID'd enemies spawn when spawner triggers them

### Storing IDs on Entities

Store the ID on the entity so it can be extracted when saving:

```typescript
const enemy = createThrowerEntity({ ... });

if (enemyData.id) {
  (enemy as any).throwerId = enemyData.id;
}

this.entityManager.add(enemy);
```

Then in `EditorScene.extractThrowers()`:

```typescript
const id = (thrower as any).throwerId;
throwers.push({
  col: cell.col,
  row: cell.row,
  difficulty: difficulty?.difficulty ?? 'medium',
  id: id || undefined  // Include ID if present
});
```

## Common Pitfalls

### ❌ Enemies with IDs Spawn at Game Start

**Symptom:** Enemies appear immediately instead of waiting for trigger.

**Cause:** Not checking `isEditorMode` flag when spawning.

**Solution:**
```typescript
if (!this.isEditorMode && enemyData.id) {
  continue;  // Skip in game mode
}
```

### ❌ Can't See Enemies with IDs in Editor

**Symptom:** Placed enemies with IDs are invisible in editor.

**Cause:** Enemies with IDs are skipped even in editor mode.

**Solution:** Reset scene when entering editor and spawn all enemies:
```typescript
editorKey.on('down', () => {
  this.isEditorMode = true;
  this.resetScene();  // Respawn everything
});
```

### ❌ IDs Not Saved to Level JSON

**Symptom:** Assigned IDs disappear after save/reload.

**Cause:** ID not stored on entity or not extracted in `extractThrowers()`.

**Solution:** Store ID on entity when spawning, read it when extracting.

### ❌ Spawner Doesn't Spawn Anything

**Symptom:** Event fires, spawner receives it, but no enemies appear.

**Cause:** 
- Enemy IDs don't match any enemies in level data
- `onSpawnEnemy` callback not creating entities correctly
- Enemies not added to `entityManager`

**Solution:** Add logging to verify:
```typescript
onSpawnEnemy: (enemyId: string) => {
  const enemyData = level.throwers?.find(t => t.id === enemyId);
  if (!enemyData) {
    console.error('Enemy not found:', enemyId);
    return;
  }
  const enemy = createThrowerEntity({ ... });
  this.entityManager.add(enemy);
}
```

## Editor Workflow

**Complete workflow for spawner system:**

1. **Place enemies:**
   - Press E → Add → Thrower
   - Click to place at desired positions
   - Click each thrower to edit
   - Assign unique IDs (th1, th2, th3, etc.)

2. **Create trigger:**
   - Press E → Trigger
   - Enter event name (e.g., "wave1")
   - Click cells to define trigger zone
   - Check "One-shot trigger"
   - Click Add Trigger

3. **Create spawner:**
   - Press E → Spawner
   - Enter same event name ("wave1")
   - Enter enemy IDs (comma-separated: "th1, th2, th3")
   - Set spawn delay (e.g., 1000ms = 1 second between spawns)
   - Click Add Spawner

4. **Test:**
   - Press E to exit editor
   - Walk into trigger zone
   - Enemies should spawn one by one with delay

5. **Save:**
   - Press E → Log
   - Copy JSON to level file
   - Refresh to test

## Best Practices

1. **Use descriptive IDs** - "th1", "robot1", "boss1" not "e1", "e2"
2. **Match event names exactly** - Trigger and spawner must use same event name
3. **Test in game mode** - Exit editor to verify spawning works
4. **One spawner per event** - Don't create multiple spawners for same event
5. **Reset scene when entering editor** - Ensures all entities visible for editing

## Related Documentation

- [Event System](./event-system.md) - Event manager and listeners
- [Level Editor](./level-editor.md) - Editor modes and workflow
- [Adding Enemies](./adding-enemies.md) - Creating new enemy types
  bug.onDestroy = () => {
    this.activeBugs.delete(bug);
  };
}

// In GameScene
const bugBase = createBugBaseEntity({
  // ...
  onSpawnBug: (bug) => {
    this.entityManager.add(bug); // Add to entity manager
  }
});
```

### 3. Spawned Entity Movement

**Problem:** Bugs spawn but don't move - they just sit at spawn position.

**Root Cause:** Missing `GridPositionComponent` or not in update order.

**Solution:** Ensure spawned entities have proper movement components:

```typescript
export function createBugEntity(props: CreateBugProps): Entity {
  const entity = new Entity('bug');
  
  // Transform
  entity.add(new TransformComponent(x, y, 0, scale));
  
  // Grid position - CRITICAL for movement
  const startCell = grid.worldToCell(x, y);
  entity.add(new GridPositionComponent(
    startCell.col,
    startCell.row,
    BUG_GRID_COLLISION_BOX
  ));
  
  // State machine with movement states
  const stateMachine = new StateMachine({
    hop: new BugHopState(entity, spawnCol, spawnRow, grid),
    chase: new BugChaseState(entity, playerEntity, grid, speed)
  }, 'hop');
  
  entity.add(new StateMachineComponent(stateMachine));
  
  // Update order - GridPositionComponent must be included
  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    AnimatedSpriteComponent,
    ShadowComponent,
    GridPositionComponent,  // CRITICAL
    StateMachineComponent
  ]);
  
  return entity;
}
```

**Key Points:**
- `GridPositionComponent` must be in update order
- State machine must have movement logic
- Transform alone is not enough - grid position tracks cell occupancy

## Difficulty System

### Difficulty Presets

Use difficulty presets instead of individual parameters:

```typescript
// Define presets
export const BUG_BASE_DIFFICULTY_CONFIG = {
  easy: {
    baseHealth: 100,
    bugHealth: 20,
    bugSpeed: 100,
    spawnIntervalMs: 4000
  },
  medium: {
    baseHealth: 150,
    bugHealth: 30,
    bugSpeed: 150,
    spawnIntervalMs: 3000
  },
  hard: {
    baseHealth: 200,
    bugHealth: 40,
    bugSpeed: 200,
    spawnIntervalMs: 2000
  }
} as const;

export type BugBaseDifficulty = keyof typeof BUG_BASE_DIFFICULTY_CONFIG;
```

### Difficulty Component

Store difficulty on the entity:

```typescript
export class BugBaseDifficultyComponent implements Component {
  entity!: Entity;
  difficulty: BugBaseDifficulty;
  
  constructor(difficulty: BugBaseDifficulty = 'medium') {
    this.difficulty = difficulty;
  }
  
  update(_delta: number): void {}
  onDestroy(): void {}
}
```

### Using Difficulty

```typescript
// In entity factory
const config = getBugBaseDifficultyConfig(difficulty);

entity.add(new HealthComponent({ maxHealth: config.baseHealth }));
entity.add(new BugSpawnerComponent(
  config.spawnIntervalMs,
  MAX_BUGS,
  ACTIVATION_RANGE_PX
));

// When spawning bugs
const bug = createBugEntity({
  // ...
  health: config.bugHealth,
  speed: config.bugSpeed
});
```

## Editor Integration

### 1. Add Entity State

Create a state for placing the entity:

```typescript
export class AddBugBaseEditorState extends EditorState {
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;
  
  onEnter(): void {
    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();
    
    // Create ghost sprite
    this.ghostSprite = gameScene.add.sprite(0, 0, 'bug_base', 0);
    this.ghostSprite.setDisplaySize(grid.cellSize, grid.cellSize);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(1000);
    
    // Register events
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }
  
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    // Snap ghost sprite to grid
  }
  
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Place entity and enter edit mode
  }
}
```

**Key Points:**
- Use `setDisplaySize(grid.cellSize, grid.cellSize)` not `setScale()`
- Ghost sprite should follow mouse and snap to grid
- Only place on click, not on enter

### 2. Edit Entity State

Create a state for editing entity properties:

```typescript
export class EditBugBaseEditorState extends EditorState {
  private bugBase: Entity | null = null;
  
  onEnter(props?: any): void {
    this.bugBase = props?.data ?? null;
    
    // Create difficulty buttons
    this.createDifficultyButtons();
    
    // Register click to move
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }
  
  private handlePointerDown(): void {
    // Check if clicked on entity
    // Enter move mode if clicked
    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      this.scene.enterMoveMode(this.bugBase, 'editBugBase');
    }
  }
  
  onExit(): void {
    // Unregister events
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
  }
}
```

**Critical:** Register and unregister `pointerdown` event for drag-to-move functionality.

### 3. Default State Integration

Add click detection in default state:

```typescript
// In DefaultEditorState.handlePointerDown()
const bugBases = gameScene.entityManager.getByType('bug_base');
for (const bugBase of bugBases) {
  const transform = bugBase.get(TransformComponent);
  if (!transform) continue;
  
  const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
  if (distance < 64) {
    this.scene.enterEditBugBaseMode(bugBase);
    return;
  }
}
```

### 4. Level Data Integration

Add to level data structure:

```typescript
export interface LevelBugBase {
  col: number;
  row: number;
  difficulty: BugBaseDifficulty;
}

export interface LevelData {
  // ...
  bugBases?: LevelBugBase[];
}
```

Add extraction method in EditorScene:

```typescript
// In EditorScene.ts
import { BugBaseDifficultyComponent } from "./bug/BugBaseDifficultyComponent";
import type { LevelBugBase } from "./level/LevelLoader";

private extractBugBases(entityManager: EntityManager, grid: Grid): LevelBugBase[] {
  const bugBases: LevelBugBase[] = [];
  const bugBaseEntities = entityManager.getByType('bug_base');
  
  for (const bugBase of bugBaseEntities) {
    const transform = bugBase.get(TransformComponent);
    const difficulty = bugBase.get(BugBaseDifficultyComponent);
    
    if (transform) {
      const cell = grid.worldToCell(transform.x, transform.y);
      
      bugBases.push({
        col: cell.col,
        row: cell.row,
        difficulty: difficulty?.difficulty ?? 'medium'
      });
    }
  }
  return bugBases;
}

// In getCurrentLevelData()
private getCurrentLevelData(): LevelData {
  // ...
  const bugBases = this.extractBugBases(entityManager, grid);
  
  return {
    // ...
    bugBases: bugBases.length > 0 ? bugBases : undefined,
  };
}
```

**Critical:** Always use `grid.worldToCell()` to convert world positions to grid coordinates. Never manually divide by `cellSize` as this doesn't account for cell centering.

Load in GameScene:

```typescript
if (level.bugBases && level.bugBases.length > 0) {
  for (const baseData of level.bugBases) {
    const x = baseData.col * this.grid.cellSize + this.grid.cellSize / 2;
    const y = baseData.row * this.grid.cellSize + this.grid.cellSize / 2;
    
    const bugBase = createBugBaseEntity({
      scene: this,
      col: baseData.col,
      row: baseData.row,
      grid: this.grid,
      playerEntity: player,
      onSpawnBug: (bug) => this.entityManager.add(bug),
      difficulty: baseData.difficulty
    });
    
    this.entityManager.add(bugBase);
  }
}
```

## Common Pitfalls

### Spawned Entities Don't Move

**Symptoms:**
- Bugs spawn but stay at spawn position
- No errors in console

**Causes:**
1. Missing `GridPositionComponent`
2. `GridPositionComponent` not in update order
3. State machine has no movement logic
4. Transform updates but grid position doesn't

**Solution:**
- Add `GridPositionComponent` to entity
- Include in `setUpdateOrder()`
- Ensure state machine updates transform AND grid position

### Editor Ghost Sprite Wrong Size

**Symptoms:**
- Ghost sprite too small or too large
- Doesn't match cell size

**Cause:**
- Using `setScale()` instead of `setDisplaySize()`

**Solution:**
```typescript
this.ghostSprite.setDisplaySize(grid.cellSize, grid.cellSize);
```

### Can't Drag Entity in Edit Mode

**Symptoms:**
- Clicking entity in edit mode does nothing
- Can't move entity to new position

**Cause:**
- `pointerdown` event not registered in edit state

**Solution:**
```typescript
onEnter(): void {
  this.scene.input.on('pointerdown', this.handlePointerDown, this);
}

onExit(): void {
  this.scene.input.off('pointerdown', this.handlePointerDown, this);
}
```

### Particles Don't Fade

**Symptoms:**
- Particles appear and disappear instantly
- No smooth fade out

**Cause:**
- Using `quantity` instead of `frequency`

**Solution:**
```typescript
const emitter = scene.add.particles(x, y, 'texture', {
  frequency: 10,  // Not quantity
  alpha: { start: 1, end: 0 },
  lifespan: 500
});

// Stop emitting after duration
scene.time.delayedCall(200, () => emitter.stop());

// Destroy after particles fade
scene.time.delayedCall(700, () => emitter.destroy());
```

## Checklist for New Spawner Entity

- [ ] Create spawner component with max count tracking
- [ ] Create spawned entity with `GridPositionComponent`
- [ ] Include `GridPositionComponent` in update order
- [ ] Register spawned entities with entity manager
- [ ] Track spawned entities in Set and clean up on destroy
- [ ] Define difficulty presets
- [ ] Create difficulty component
- [ ] Create add entity editor state with ghost sprite
- [ ] Create edit entity editor state with difficulty buttons
- [ ] Register `pointerdown` event in edit state for drag-to-move
- [ ] Add click detection in default editor state
- [ ] Add to level data structure (interface in LevelLoader.ts)
- [ ] Add extraction method in EditorScene.ts
- [ ] Call extraction method in getCurrentLevelData()
- [ ] Load from level JSON in GameScene
- [ ] Test spawning, movement, difficulty, and editor
- [ ] Test save/load cycle (place entity, save, reload level)

## Related Documentation

- [Adding Enemies](./adding-enemies.md) - General enemy creation guide
- [ECS Architecture](./ecs-architecture.md) - Component system overview
- [Level Editor](./level-editor.md) - Editor system details
