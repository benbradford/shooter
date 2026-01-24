# Hit Flash System

This guide explains how to implement visual feedback when entities take damage using the reusable `HitFlashComponent`.

## Overview

The `HitFlashComponent` provides a standardized red flash effect when entities take damage. It alternates between a red tint and normal appearance, creating a clear visual indicator that damage has been dealt.

## Component Behavior

- **Flash color:** Light red (`0xff8888`)
- **Flash interval:** 100ms (alternates between red and normal)
- **Duration:** Configurable (typically 300ms for player, varies for enemies)
- **Auto-stop:** Automatically stops flashing after the specified duration

## Usage Pattern

### 1. Add Component to Entity

Add the `HitFlashComponent` to any entity that should flash when taking damage:

```typescript
import { HitFlashComponent } from '../ecs/components/HitFlashComponent';

// In your entity creation function
entity.add(new HitFlashComponent());

// Add to update order (before StateMachineComponent if using states)
entity.setUpdateOrder([
  TransformComponent,
  SpriteComponent,
  // ... other components
  HitFlashComponent,
  StateMachineComponent, // If applicable
]);
```

### 2. Trigger Flash on Damage

Call `flash(duration)` when the entity takes damage:

```typescript
// In collision handler or damage logic
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(300); // Flash for 300ms
}
```

### 3. Manual Control (Optional)

You can manually stop the flash if needed:

```typescript
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.stop(); // Immediately stop flashing and clear tint
}
```

## Implementation Examples

### Player Entity

The player flashes when hit by enemy projectiles:

```typescript
// In PlayerEntity.ts
entity.add(new HitFlashComponent());

entity.add(new CollisionComponent({
  box: PLAYER_ENTITY_COLLISION_BOX,
  collidesWith: ['enemy_projectile', 'enemy'],
  onHit: (other) => {
    if (other.tags.has('enemy_projectile')) {
      const damage = other.get(DamageComponent);
      if (damage) {
        health.takeDamage(damage.damage);
      }
      const hitFlash = entity.get(HitFlashComponent);
      if (hitFlash) {
        hitFlash.flash(300); // Flash for 300ms
      }
    }
  }
}));
```

### Robot Enemy with State Machine

Robots use the component in their hit state:

```typescript
// In StalkingRobotEntity.ts
entity.add(new HitFlashComponent());

// In RobotHitState.ts
export class RobotHitState implements IState {
  private readonly entity: Entity;
  private readonly hitDuration: number;

  onEnter(): void {
    const hitFlash = this.entity.get(HitFlashComponent);
    if (hitFlash) {
      hitFlash.flash(this.hitDuration); // Flash for entire hit state duration
    }
  }

  onExit(): void {
    const hitFlash = this.entity.get(HitFlashComponent);
    if (hitFlash) {
      hitFlash.stop(); // Ensure flash is stopped when exiting state
    }
  }
}
```

## Best Practices

### 1. Consistent Duration

Use consistent flash durations for similar entity types:
- **Player:** 300ms (quick feedback)
- **Small enemies:** 200-300ms
- **Large enemies/bosses:** 400-500ms (longer for emphasis)

### 2. Component Order

Place `HitFlashComponent` in the update order:
- **After** `SpriteComponent` (needs sprite to apply tint)
- **Before** `StateMachineComponent` (if using state-based flashing)

### 3. State Machine Integration

For enemies with state machines:
- Trigger flash in `onEnter()` of hit state
- Stop flash in `onExit()` to ensure clean state transitions
- Use hit state duration as flash duration for consistency

### 4. Collision Handler Pattern

When handling collisions:
1. Apply damage first
2. Trigger flash second
3. Handle other effects (particles, knockback, etc.)

```typescript
onHit: (other) => {
  // 1. Apply damage
  health.takeDamage(damage.damage);
  
  // 2. Trigger flash
  const hitFlash = entity.get(HitFlashComponent);
  if (hitFlash) {
    hitFlash.flash(300);
  }
  
  // 3. Other effects
  const particles = entity.get(HitParticlesComponent);
  if (particles) {
    particles.emit();
  }
}
```

## Component API

### Methods

**`flash(durationMs: number): void`**
- Starts the flash effect for the specified duration
- Immediately applies red tint
- Automatically stops after duration

**`stop(): void`**
- Immediately stops flashing
- Clears any tint from the sprite
- Safe to call even if not currently flashing

**`update(delta: number): void`**
- Called automatically by the ECS system
- Handles flash timing and tint toggling
- No need to call manually

### Properties

All properties are private - use the public methods instead.

## Common Patterns

### Simple Damage Flash

For entities that don't use state machines:

```typescript
entity.add(new HitFlashComponent());

// In collision or damage handler
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(300);
}
```

### State-Based Flash

For entities with hit states:

```typescript
// In hit state
onEnter(): void {
  const hitFlash = this.entity.get(HitFlashComponent);
  if (hitFlash) {
    hitFlash.flash(this.hitDuration);
  }
}

onExit(): void {
  const hitFlash = this.entity.get(HitFlashComponent);
  if (hitFlash) {
    hitFlash.stop();
  }
}
```

### Conditional Flash

Only flash if entity is still alive:

```typescript
const health = entity.get(HealthComponent);
if (health && health.getHealth() > 0) {
  const hitFlash = entity.get(HitFlashComponent);
  if (hitFlash) {
    hitFlash.flash(300);
  }
}
```

## Integration with Other Systems

### With Particle Effects

Combine with hit particles for better feedback:

```typescript
// Apply damage
health.takeDamage(damage.damage);

// Flash
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(300);
}

// Particles
const particles = entity.get(HitParticlesComponent);
if (particles) {
  particles.emitHitParticles(dirX, dirY);
}
```

### With Knockback

Flash during knockback for combined effect:

```typescript
// Apply knockback
const knockback = entity.get(KnockbackComponent);
if (knockback) {
  knockback.applyKnockback(dirX, dirY, force);
}

// Flash during knockback
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(knockbackDuration); // Match knockback duration
}
```

### With State Machines

Transition to hit state and let state handle flash:

```typescript
// In collision handler
const stateMachine = entity.get(StateMachineComponent);
if (stateMachine) {
  stateMachine.stateMachine.enter('hit');
}

// Hit state handles the flash in onEnter()
```

## Troubleshooting

### Flash Not Visible

**Problem:** Entity doesn't flash when damaged.

**Solutions:**
1. Verify `HitFlashComponent` is added to entity
2. Check component is in update order
3. Ensure `flash()` is being called
4. Verify entity has a `SpriteComponent`

### Flash Doesn't Stop

**Problem:** Entity stays red after flash should end.

**Solutions:**
1. Check `stop()` is called in state `onExit()`
2. Verify component is being updated (in update order)
3. Ensure duration is reasonable (not infinite)

### Flash Interrupted

**Problem:** Flash stops early when taking multiple hits.

**Solutions:**
1. This is expected behavior - each hit restarts the flash
2. If you want to extend the flash, call `flash()` again with remaining time
3. Consider adding invincibility frames to prevent rapid hits

## Related Documentation

- [Particle Effects](./particle-effects.md) - Combine with hit particles
- [Collision System](./collision-system.md) - Trigger flash on collision
- [Adding Enemies](./adding-enemies.md) - Integrate into enemy entities
- [ECS Architecture](./ecs-architecture.md) - Component system overview
