# ECS Architecture Guide

This document explains the Entity-Component-System architecture and best practices for creating components.

**Related Docs:**
- [Coding Standards](./coding-standards.md) - TypeScript best practices, modern JavaScript standards
- [Quick Reference](./quick-reference.md) - Common tasks and patterns

---

## Core Concepts

### Entity-Component System (ECS)

- **Entity**: A container with an ID that holds components
- **Component**: Reusable logic/data modules that define behavior
- **Update Order**: Components update in a specific order defined per entity

### Why ECS?

- **Composition over inheritance**: Build entities from components
- **Reusability**: Components work across different entity types
- **Flexibility**: Add/remove behavior by adding/removing components
- **Clear dependencies**: Components declare what they need

## Component Design Principles

### 1. Think About Reusability First

**Before creating a component, ask:**
- Could this work for player, enemies, NPCs, turrets?
- What values might vary between different entities?
- Can I make this generic enough to reuse?

### 2. Always Use Props for Configuration

**All configurable values must be passed as props - never use defaults.**

**Why no defaults?**
- Makes configuration explicit and visible
- Prevents confusion about what values are actually used
- Forces you to think about appropriate values per entity
- Easier to see differences between entity types

### 3. Single Responsibility

Each component should do ONE thing.

### 4. Decouple Through Callbacks

Make components reusable by accepting callbacks instead of hardcoding behavior.

### 5. Minimal Dependencies

Only depend on what you actually need.

### 6. Check for Existing Components First

**Before creating a new component:**
1. Check if an existing component can be extended
2. Check if props can make an existing component work
3. Only create new if truly different behavior needed

## Component Template

Use this template when creating new components:

```typescript
import type { Component } from '../Component';
import type { Entity } from '../Entity';

// 1. Define props interface - all required, no defaults
export interface MyComponentProps {
  value1: number;
  value2: number;
  callback?: () => void;  // Only callbacks can be optional
}

// 2. Implement component
export class MyComponent implements Component {
  entity!: Entity;
  private readonly value1: number;
  private readonly value2: number;
  private readonly callback?: () => void;
  
  constructor(
    private readonly dependency: SomeComponent,
    props: MyComponentProps
  ) {
    // Store props as readonly properties
    this.value1 = props.value1;
    this.value2 = props.value2;
    this.callback = props.callback;
  }
  
  // Only implement methods you need - both are optional
  update?(delta: number): void {
    // Component logic (omit if pure data)
  }
  
  onDestroy?(): void {
    // Cleanup (omit if no cleanup needed)
  }
}

// Data-only component example (no methods needed):
export class DifficultyComponent<T extends string> implements Component {
  entity!: Entity;
  constructor(public difficulty: T) {}
}
```

## Component Update Order

**Critical**: Components update in the order specified by `setUpdateOrder()`.

**Standard order for moving entities**:
```typescript
entity.setUpdateOrder([
  TransformComponent,      // 1. Base position
  HitFlashComponent,       // 2. Modify sprite tint (before sprite renders)
  SpriteComponent,         // 3. Sync sprite with transform
  InputComponent,          // 4. Read input
  WalkComponent,           // 5. Calculate new position
  GridCollisionComponent,  // 6. Validate and adjust position
  StateMachineComponent,   // 7. Update state based on movement
  AnimationComponent,      // 8. Update animation frames
]);
```

**Why this order matters**:
- HitFlashComponent must update BEFORE SpriteComponent (modifies tint)
- Walk must update before GridCollision (so collision sees new position)
- GridCollision must update before StateMachine (so states see final position)
- StateMachine must update before Animation (so animation changes apply)

## Entity Design

### One Component Type Per Entity

**Solution**: Design components to handle multiple instances internally.

### Class-Based Update Order

Use component classes in `setUpdateOrder()`, not instances.

## Creating New Entities

Use factory functions to create entities. See existing entity factories for patterns.

## Entity Manager

**All entities are managed by a single EntityManager:**

```typescript
class EntityManager {
  add(entity: Entity): Entity
  update(delta: number): void
  getByType(type: string): Entity[]
  getFirst(type: string): Entity | undefined
  destroyAll(): void
  get count(): number
}
```

## Key Takeaways

1. **Reusability first** - Think about how component can work for multiple entity types
2. **No defaults** - All props required, explicit configuration
3. **Single responsibility** - One component, one job
4. **Decouple with callbacks** - Make components generic
5. **Minimal dependencies** - Only depend on what you need
6. **Check existing first** - Extend before creating new
7. **Update order matters** - Control component execution sequence
8. **One type per entity** - Enforced at runtime

## Animation System

The `Animation` class supports four styles:

- **`'static'`** - Single frame, no animation
- **`'repeat'`** - Loops continuously (walk cycles)
- **`'pingpong'`** - Plays forward then backward (breathing effects)
- **`'once'`** - Plays through once and holds last frame (punch, attack)

**Key behavior:** Calling `AnimationSystem.play()` with the same animation key resets it. This allows `'once'` animations to replay.

## Common Patterns

### Smooth Enemy Pushing

When enemies should move away from the player on collision box overlap, use `KnockbackComponent` for smooth movement instead of instant teleport.

This prevents jerky "teleport" behavior when player walks into enemies.
