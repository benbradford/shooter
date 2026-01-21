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
export interface LevelEnemy {
  type: string; // 'robot', 'turret', etc.
  col: number;
  row: number;
  health: number;
  speed: number;
  waypoints: Array<{ col: number; row: number }>;
  // Add enemy-specific properties as needed
}

export interface LevelData {
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  cells: Array<{ col: number; row: number; layer: number }>;
  enemies?: LevelEnemy[]; // Optional array of enemies
}
```

**Update GameScene.ts:**
```typescript
// In create() after loading level
if (level.enemies && level.enemies.length > 0) {
  for (const enemyData of level.enemies) {
    const x = enemyData.col * this.grid.cellSize + this.grid.cellSize / 2;
    const y = enemyData.row * this.grid.cellSize + this.grid.cellSize / 2;
    
    let enemy: Entity;
    switch (enemyData.type) {
      case 'robot':
        enemy = createStalkingRobotEntity(
          this, x, y, this.grid, player,
          enemyData.waypoints, enemyData.health, enemyData.speed
        );
        break;
      case 'turret':
        enemy = createTurretEntity(
          this, x, y, this.grid, player,
          enemyData.health
        );
        break;
      default:
        console.warn('Unknown enemy type:', enemyData.type);
        continue;
    }
    
    this.entityManager.add(enemy);
  }
}
```

### 6. Add to Level JSON

**Example level with enemies:**
```json
{
  "width": 40,
  "height": 30,
  "playerStart": {
    "x": 9,
    "y": 9
  },
  "cells": [...],
  "enemies": [
    {
      "type": "robot",
      "col": 12,
      "row": 9,
      "health": 100,
      "speed": 100,
      "waypoints": [
        { "col": 12, "row": 9 },
        { "col": 15, "row": 9 }
      ]
    },
    {
      "type": "turret",
      "col": 20,
      "row": 15,
      "health": 50,
      "speed": 0,
      "waypoints": []
    }
  ]
}
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

## Example: Stalking Robot

The Stalking Robot is a complete example in the codebase:

**Files:**
- `src/robot/StalkingRobotEntity.ts` - Factory function
- `src/robot/RobotPatrolState.ts` - Waypoint navigation
- `src/robot/RobotAlertState.ts` - Detection indicator
- `src/robot/RobotStalkingState.ts` - Chase player
- `src/robot/RobotFireballState.ts` - Attack animation
- `src/robot/RobotHitState.ts` - Damage response
- `src/robot/RobotDeathState.ts` - Death animation
- `src/ecs/components/PatrolComponent.ts` - Waypoint system
- `src/ecs/components/LineOfSightComponent.ts` - Player detection
- `src/ecs/components/KnockbackComponent.ts` - Physics response

**Behavior:**
1. Patrols between waypoints
2. Detects player within 500px
3. Shows exclamation mark for 1 second
4. Chases player at 2x speed
5. Fires projectile when in range
6. Takes knockback when hit
7. Flashes red and pauses for 1 second
8. Dies with fade-out animation

## Common Patterns

### Directional Animation
```typescript
// Calculate direction to target
const dx = targetX - sprite.x;
const dy = targetY - sprite.y;
const angle = Math.atan2(dy, dx);

// Convert to 8-direction index (0-7)
const direction = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;

// Play directional animation
sprite.play(`walk_${direction}`);
```

### Waypoint Navigation
```typescript
const patrol = entity.get(PatrolComponent);
const waypoint = patrol.getCurrentWaypoint();
const targetX = waypoint.col * grid.cellSize + grid.cellSize / 2;
const targetY = waypoint.row * grid.cellSize + grid.cellSize / 2;

// Move toward waypoint
const distance = Math.sqrt((targetX - x) ** 2 + (targetY - y) ** 2);
if (distance < 5) {
  patrol.nextWaypoint();
}
```

### Line of Sight Detection
```typescript
const los = entity.get(LineOfSightComponent);
const playerPos = player.get(TransformComponent);
const distance = Math.sqrt(
  (playerPos.x - x) ** 2 + (playerPos.y - y) ** 2
);

if (distance < los.range) {
  los.hasTarget = true;
  los.targetX = playerPos.x;
  los.targetY = playerPos.y;
}
```

### Knockback Physics
```typescript
const knockback = entity.get(KnockbackComponent);
if (knockback) {
  // Apply velocity
  transform.x += knockback.velocityX * (delta / 1000);
  transform.y += knockback.velocityY * (delta / 1000);
  
  // Apply friction
  knockback.velocityX *= knockback.friction;
  knockback.velocityY *= knockback.friction;
  
  // Update timer
  knockback.duration -= delta;
  if (knockback.duration <= 0) {
    entity.remove(KnockbackComponent);
  }
}
```

## Testing Checklist

- [ ] Enemy spawns at correct position
- [ ] Animations play correctly for all states
- [ ] State transitions work as expected
- [ ] Collision detection works (walls, player, projectiles)
- [ ] Takes damage and dies properly
- [ ] Doesn't cause performance issues with multiple instances
- [ ] Works correctly after save/load
- [ ] Debug logs removed

## Future Improvements

- **Enemy Editor** - Visual tool for placing enemies in levels
- **Behavior Trees** - More complex AI patterns
- **Difficulty Scaling** - Adjust health/speed based on level
- **Enemy Variants** - Different colors/abilities for same type
- **Spawn Triggers** - Enemies appear based on player position/events
