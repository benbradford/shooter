# Adding Enemies

This guide explains how to add new enemy types to the game, based on the implementation of the Stalking Robot enemy.

## Overview

Enemies in this game use:
- **ECS Architecture** - Entities with components for behavior
- **State Machines** - Different AI states (patrol, alert, attack, etc.)
- **Grid-based positioning** - Enemies use col/row coordinates
- **Level JSON** - Enemies are defined in level files

## Step-by-Step Process

### 1. Prepare Assets

**Sprite Sheet:**
- Create a sprite sheet with all animation frames
- Organize by animation type (idle, walk, attack, death, etc.)
- Document the layout in `docs/` for reference
- Add to `src/assets/AssetRegistry.ts`:

```typescript
your_enemy: {
  key: 'your_enemy',
  path: 'assets/your_enemy/spritesheet.png',
  type: 'spritesheet',
  config: { frameWidth: 48, frameHeight: 48 }
}
```

**Additional Assets:**
- Alert indicators (exclamation marks, etc.)
- Effect sprites (projectiles, particles, etc.)

### 2. Create Components

Create reusable components in `src/ecs/components/`:

**Example - PatrolComponent.ts:**
```typescript
import type { Component } from '../Component';

export class PatrolComponent implements Component {
  waypoints: Array<{ col: number; row: number }>;
  currentWaypointIndex: number = 0;

  constructor(waypoints: Array<{ col: number; row: number }>) {
    this.waypoints = waypoints;
  }

  getCurrentWaypoint(): { col: number; row: number } {
    return this.waypoints[this.currentWaypointIndex];
  }

  nextWaypoint(): void {
    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
  }
}
```

**Common Component Types:**
- **Movement** - Patrol routes, chase behavior
- **Detection** - Line of sight, proximity triggers
- **Combat** - Attack patterns, damage dealing
- **Physics** - Knockback, collision response

### 3. Create State Classes

Create state classes in `src/enemy/` (or `src/robot/` for robots):

**State Structure:**
```typescript
import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';

export class EnemyPatrolState implements IState {
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  onEnter(_prevState?: IState): void {
    // Setup when entering this state
    // Start animations, reset timers, etc.
  }

  onExit(_nextState?: IState): void {
    // Cleanup when leaving this state
    // Stop animations, clear timers, etc.
  }

  update(delta: number): void {
    // Per-frame logic
    // Movement, detection, state transitions
  }
}
```

**Common States:**
- **Patrol** - Follow waypoints, idle animations
- **Alert** - Detected player, show indicator
- **Chase/Stalk** - Move toward player
- **Attack** - Execute attack animation/logic
- **Hit** - Take damage, knockback, flash red
- **Death** - Death animation, fade out, remove entity

**State Transitions:**
```typescript
// In update() method
const losComponent = this.entity.get(LineOfSightComponent);
if (losComponent?.hasTarget) {
  this.entity.get(StateMachineComponent)?.stateMachine.enter('alert');
}
```

### 4. Create Entity Factory

Create a factory function in `src/enemy/YourEnemyEntity.ts`:

```typescript
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { StateMachine } from '../utils/state/StateMachine';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { PatrolComponent } from '../ecs/components/PatrolComponent';
import type { Grid } from '../utils/Grid';

export function createYourEnemyEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  grid: Grid,
  player: Entity,
  waypoints: Array<{ col: number; row: number }>,
  health: number = 100,
  speed: number = 100
): Entity {
  const entity = new Entity();

  // Transform
  entity.add(new TransformComponent(x, y, 4)); // 4x scale

  // Sprite
  const sprite = scene.add.sprite(x, y, 'your_enemy', 0);
  sprite.setScale(4);
  entity.add(new SpriteComponent(sprite));

  // Health
  entity.add(new HealthComponent(health));

  // Patrol
  entity.add(new PatrolComponent(waypoints));

  // State Machine
  const stateMachine = new StateMachine({
    patrol: new EnemyPatrolState(entity, grid, speed),
    alert: new EnemyAlertState(entity, scene),
    attack: new EnemyAttackState(entity, scene, player),
    hit: new EnemyHitState(entity),
    death: new EnemyDeathState(entity, scene)
  }, 'patrol');

  entity.add(new StateMachineComponent(stateMachine));

  return entity;
}
```

### 5. Add to Level System

**Update LevelLoader.ts:**
```typescript
export interface LevelRobot {
  col: number;
  row: number;
  health: number;
  speed: number;
  waypoints: Array<{ col: number; row: number }>;
  fireballSpeed: number;
  fireballDuration: number;
}

export interface LevelData {
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  cells: Array<{ col: number; row: number; layer: number }>;
  robots?: LevelRobot[]; // Optional array of robots
}
```

**Note:** Currently only robots are supported. To add other enemy types, you would need to create a generic `LevelEnemy` interface with a `type` field and type-specific properties.

**Update GameScene.ts:**
```typescript
// In create() after loading level
if (level.robots && level.robots.length > 0) {
  for (const robotData of level.robots) {
    const x = robotData.col * this.grid.cellSize + this.grid.cellSize / 2;
    const y = robotData.row * this.grid.cellSize + this.grid.cellSize / 2;
    
    const robot = createStalkingRobotEntity(
      this, x, y, this.grid, player,
      robotData.waypoints,
      robotData.health,
      robotData.speed,
      robotData.fireballSpeed,
      robotData.fireballDuration
    );
    
    this.entityManager.add(robot);
  }
}
```

### 6. Add to Level JSON

**Example level with robots:**
```json
{
  "width": 40,
  "height": 30,
  "playerStart": {
    "x": 9,
    "y": 9
  },
  "cells": [...],
  "robots": [
    {
      "col": 12,
      "row": 9,
      "health": 100,
      "speed": 100,
      "waypoints": [
        { "col": 12, "row": 9 },
        { "col": 15, "row": 9 }
      ],
      "fireballSpeed": 400,
      "fireballDuration": 2000
    }
  ]
}
```

## Adding Invisible/System Entities (like Triggers)

For entities that don't have sprites but provide game functionality:

### 1. Create Component with Game Logic

```typescript
export class TriggerComponent implements Component {
  entity!: Entity;
  public readonly eventName: string;
  public readonly triggerCells: Array<{ col: number; row: number }>;
  
  constructor(props: TriggerComponentProps) {
    this.eventName = props.eventName;
    this.triggerCells = props.triggerCells;
  }
  
  update(_delta: number): void {
    // Game logic here - check player position, fire events, etc.
  }
}
```

### 2. Create Simple Entity Factory

```typescript
export function createTriggerEntity(props: CreateTriggerEntityProps): Entity {
  const entity = new Entity('trigger');
  
  // Position at first trigger cell (for editor visualization)
  const firstCell = props.triggerCells[0];
  const worldPos = props.grid.cellToWorld(firstCell.col, firstCell.row);
  const centerX = worldPos.x + props.grid.cellSize / 2;
  const centerY = worldPos.y + props.grid.cellSize / 2;
  
  entity.add(new TransformComponent(centerX, centerY, 0, 1));
  entity.add(new TriggerComponent(props));
  
  entity.setUpdateOrder([
    TransformComponent,
    TriggerComponent
  ]);
  
  return entity;
}
```

### 3. Add to Level Data Structure

```typescript
export type LevelTrigger = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number }>;
}

export type LevelData = {
  // ... existing fields
  triggers?: LevelTrigger[];
}
```

## Editor Integration

### 1. Create Editor State

```typescript
export class TriggerEditorState extends EditorState {
  private selectedCells: Set<string> = new Set();
  private selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  onEnter(): void {
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }
  
  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearSelectionRectangles();
  }
  
  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    // CRITICAL: Check for UI button clicks first
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        if ((obj as any).depth >= 1000) { // UI elements have high depth
          return; // Don't process grid clicks when clicking UI
        }
      }
    }
    
    // Process grid cell selection...
  };
}
```

### 2. Add Button to Default Editor State

```typescript
// In DefaultEditorState.ts
const triggerButton = this.scene.add.text(centerX + buttonSpacing * 4, buttonY, 'Trigger', {
  fontSize: '24px',
  color: '#ffffff',
  backgroundColor: '#333333',
  padding: { x: 20, y: 10 }
});
triggerButton.setOrigin(0.5);
triggerButton.setScrollFactor(0);
triggerButton.setInteractive({ useHandCursor: true });
triggerButton.setDepth(1000);
this.buttons.push(triggerButton);

triggerButton.on('pointerdown', () => {
  this.scene.enterTriggerMode();
});
```

### 3. Add State to EditorScene

```typescript
// In EditorScene.ts imports
import { TriggerEditorState } from "../editor/TriggerEditorState";

// In state machine initialization
this.stateMachine = new StateMachine({
  // ... existing states
  trigger: new TriggerEditorState(this)
}, 'default');

// Add method
enterTriggerMode(): void {
  this.stateMachine.enter('trigger');
}
```

### 4. Level Data Integration

**CRITICAL:** Modify GameScene's level data directly, not EditorScene's computed data:

```typescript
// In TriggerEditorState.addTrigger()
private addTrigger(): void {
  // Get the GameScene's level data directly - CRITICAL!
  const gameScene = this.scene.scene.get('game') as any;
  const levelData = gameScene.getLevelData();
  
  if (!levelData.triggers) {
    levelData.triggers = [];
  }
  
  levelData.triggers.push(newTrigger);
  this.scene.enterDefaultMode();
}
```

**Why this is critical:** EditorScene's `getCurrentLevelData()` creates a computed result. Changes to computed data don't persist. You must modify the GameScene's actual level data object.

### 5. Update Level Data Extraction

```typescript
// In EditorScene.getCurrentLevelData()
getCurrentLevelData(): LevelData {
  // ... extract other data
  
  // Get existing level data to preserve editor changes
  const existingLevelData = gameScene.getLevelData();
  
  return {
    // ... other fields
    triggers: existingLevelData.triggers, // Preserve from GameScene
  };
}
```

## Debug Visualization

### Add to Grid Rendering

```typescript
// In Grid.render() method
// Draw trigger cells with yellow outline when grid debug is enabled
if (levelData?.triggers) {
  for (const trigger of levelData.triggers) {
    for (const cell of trigger.triggerCells) {
      const worldPos = this.cellToWorld(cell.col, cell.row);
      this.graphics.lineStyle(3, 0xffff00, 1);
      this.graphics.strokeRect(worldPos.x, worldPos.y, this.cellSize, this.cellSize);
    }
  }
}
```

### Update GameScene to Pass Level Data

```typescript
// In GameScene.update()
this.grid.render(this.entityManager, this.levelData);
```

## Best Practices

### Component Design
- **Single Responsibility** - Each component handles one aspect
- **Reusable** - Components should work across enemy types
- **Data-focused** - Store data, not behavior

### State Machine Design
- **Clear Transitions** - Document when states change
- **Cleanup** - Always cleanup in `onExit()`
- **Shared Logic** - Extract common code to helper methods

### Performance
- **Object Pooling** - Reuse projectiles, effects
- **Efficient Collision** - Use spatial partitioning for many enemies
- **Update Frequency** - Not all enemies need to update every frame

### Debugging
- **Console Logs** - Add logs during development
- **Visual Indicators** - Show state, waypoints, detection radius
- **Remove Debug Code** - Clean up before committing

## Common Pitfalls and Solutions

### ❌ Editor Button Clicks Trigger Grid Selection

**Problem:** Clicking editor buttons also selects grid cells behind them.

**Solution:** Always check for UI element hits before processing grid clicks:
```typescript
private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
  const gameScene = this.scene.scene.get('game');
  const hitObjects = gameScene.input.hitTestPointer(pointer);
  
  if (hitObjects.length > 0) {
    for (const obj of hitObjects) {
      if ((obj as any).depth >= 1000) {
        return; // UI element clicked, ignore grid
      }
    }
  }
  // Process grid click...
};
```

### ❌ Visual Selection Not Updating

**Problem:** Cell selection/deselection works in logic but visuals don't update.

**Cause:** Creating new rectangles every frame without destroying old ones.

**Solution:** Track rectangles and destroy them immediately:
```typescript
private selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();

// On select
const border = gameScene.add.rectangle(...);
this.selectionRectangles.set(cellKey, border);

// On deselect
const rect = this.selectionRectangles.get(cellKey);
if (rect) {
  rect.destroy();
  this.selectionRectangles.delete(cellKey);
}
```

### ❌ Level Data Not Persisting

**Problem:** Changes made in editor don't appear in logged JSON.

**Cause:** Modifying computed data instead of source data.

**Solution:** Always modify GameScene's level data directly:
```typescript
// ❌ Wrong - modifies computed result
const levelData = this.scene.getCurrentLevelData();

// ✅ Correct - modifies source data
const gameScene = this.scene.scene.get('game') as any;
const levelData = gameScene.getLevelData();
```

### ❌ Input Capturing Game Keys

**Problem:** Typing in editor inputs triggers game controls (WASD moves camera).

**Solution:** Stop event propagation on input elements:
```typescript
this.eventNameInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
});
```

### ❌ Debug Visuals Not Showing

**Problem:** Added debug rendering but it doesn't appear.

**Cause:** Rendering in wrong debug mode or wrong render method.

**Solution:** Add to main grid render, not scene debug:
```typescript
// In Grid.render() - shows when G key pressed
if (levelData?.triggers) {
  // Render triggers
}

// Not in renderSceneDebug() - only shows when C key pressed
```

### ❌ Entity Not Updating

**Problem:** Entity exists but component logic doesn't run.

**Cause:** Component not in update order or missing from EntityManager.

**Solution:** 
1. Add component to `setUpdateOrder()`
2. Ensure entity is added to EntityManager
3. Check component has `update()` method

## Testing Checklist

- [ ] Entity spawns at correct position
- [ ] Animations play correctly for all states
- [ ] State transitions work as expected
- [ ] Collision detection works (walls, player, projectiles)
- [ ] Takes damage and dies properly
- [ ] Doesn't cause performance issues with multiple instances
- [ ] Works correctly after save/load
- [ ] Debug logs removed
- [ ] Editor integration works (if applicable)
- [ ] Level JSON exports correctly
- [ ] Debug visualization shows (if applicable)

## Future Improvements

- **Enemy Editor** - Visual tool for placing enemies in levels
- **Behavior Trees** - More complex AI patterns
- **Difficulty Scaling** - Adjust health/speed based on level
- **Enemy Variants** - Different colors/abilities for same type
- **Spawn Triggers** - Enemies appear based on player position/events
