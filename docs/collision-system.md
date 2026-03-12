# Collision System

## Overview

The collision system provides entity-to-entity collision detection using AABB (Axis-Aligned Bounding Box) collision with spatial partitioning optimization. It is separate from grid/wall collision which is handled by `ProjectileComponent`.

## Components

### CollisionComponent

Defines collision properties for an entity. See `src/ecs/components/combat/CollisionComponent.ts` for interface.

### Entity Tags

Entities now have a `tags` property to identify what they are:

```typescript
entity.tags.add('player');
entity.tags.add('enemy');
entity.tags.add('player_projectile');
entity.tags.add('enemy_projectile');
```

## CollisionSystem

Located in `src/systems/CollisionSystem.ts`, this system:
- Uses **spatial partitioning** via grid cells for efficient collision detection
- Checks entities with `CollisionComponent` each frame
- Uses AABB collision detection (box overlap)
- Only checks pairs that should collide (based on tags)
- Triggers `onHit` callbacks when collision occurs
- Provides debug rendering (black boxes) when enabled

### Spatial Partitioning Optimization

The collision system uses the grid's `occupants` tracking for spatial awareness:

**Grid-Based Entities** (have `GridPositionComponent`):
- Only check their current cell + 8 neighboring cells (9 cells total)
- Leverages existing `grid.occupants` data maintained by `GridCollisionComponent`
- Dramatically reduces collision checks for spread-out entities

**Non-Grid Entities** (projectiles without grid position):
- Fall back to checking all collidable entities
- Ensures nothing is missed even without grid tracking

**Performance Gains:**
- Small maps (10-20 entities): Minimal difference
- Medium maps (50-100 entities): **5-10x faster**
- Large maps (200+ entities): **20-50x faster**

The optimization is most effective when entities are spread across the map. If all entities cluster in one area, it degrades gracefully to near-original performance.

## Debug Rendering

Press **C** key to toggle collision box visualization:
- Black outlined boxes show collision areas
- Also toggles grid occupant highlighting
- Collision boxes render at depth 10000 (on top)

## Collision Callback Best Practices

### Principle: Each Entity Decides Its Own Fate

**Good Pattern:**
- Bullet destroys itself on next frame using `scene.time.delayedCall(0, ...)`
- Both callbacks execute in the current frame
- Robot can safely read `ProjectileComponent` data before bullet is destroyed
- No timing issues, no ordering dependencies

**Bad Pattern (Don't Do This):**
- Robot destroying the bullet (shouldn't decide bullet's fate)
- Immediate destruction (destroys before other callback runs)

### Timing and Frame Delays

**Problem:** If entity A destroys itself immediately in its callback, entity B's callback can't read A's components.

**Solution:** Delay destruction by one frame:

```typescript
// Destroy on next frame
scene.time.delayedCall(0, () => entity.destroy());
```

This ensures:
- Both collision callbacks complete in current frame
- All component data is readable
- Destruction happens cleanly before next frame's collision check

### Knockback Implementation

When applying knockback from projectiles:

```typescript
// Always normalize direction for consistent distance
const length = Math.hypot(projectile.dirX, projectile.dirY);
const normalizedDirX = projectile.dirX / length;
const normalizedDirY = projectile.dirY / length;
knockback.applyKnockback(normalizedDirX, normalizedDirY, FORCE);

// Ignore new knockback while already active
if (this.isActive) return;

// Apply friction per-second, not per-frame
const frictionPerFrame = Math.pow(this.friction, delta / 1000);
this.velocityX *= frictionPerFrame;
```

**Key points:**
- Normalize direction vectors for consistent knockback distance
- Ignore overlapping knockback to prevent inconsistent behavior
- Use time-based friction for frame-rate independence

## Separation of Concerns

**CollisionSystem** handles:
- Entity ↔ Entity collision
- Projectile ↔ Entity collision

**ProjectileComponent** handles:
- Projectile ↔ Wall collision
- Layer-based wall blocking
- Transition cell upgrades

This separation keeps concerns isolated and allows:
- Fireballs to use CollisionComponent without ProjectileComponent
- Bullets to use both for complete collision detection
- Entities to collide with each other without grid involvement

## Two Types of Collision Boxes

Entities that interact with both the grid and other entities need **two separate collision boxes**:

### Grid Collision Box (GridPositionComponent)
- Used for wall/grid collision
- Typically offset to the right (offsetX: 0 or positive)
- Used by GridCollisionComponent for movement blocking

### Entity Collision Box (CollisionComponent)
- Used for entity-to-entity collision (projectiles, enemies, etc.)
- Typically centered (offsetX: negative half-width)
- Used by CollisionSystem for damage/interaction

**Why separate?**
- Grid collision needs to align with grid cells for wall detection
- Entity collision needs to be centered for accurate hit detection
- Different sizes optimize for different purposes

## Integration

In `GameScene.update()`:
```typescript
// Update entities first
this.entityManager.update(delta);

// Then check collisions
this.collisionSystem.update(this.entityManager.getAll());
```

## Next Steps

The collision system is fully integrated. To add collision to a new entity:
1. Add appropriate tag(s) to entity
2. Add DamageComponent if it deals damage
3. Add CollisionComponent with collision box and onHit callback
4. Test with C key debug visualization
