# Particle Effects Guide

This guide covers how to add particle effects to entities in the game.

## Overview

Particle effects in Phaser are created using the particle emitter system. In this game, particles are owned by entities as components and follow the entity's transform.

## Example: Robot Hit Particles

When a robot is hit by a bullet, it emits bluey-white particles that spray out in the bullet's direction.

### 1. Create the Particle Texture

Create a small texture (8x8 pixels) for the particle:

```python
from PIL import Image
img = Image.new('RGBA', (8, 8), (136, 204, 255, 255))  # #88ccff bluey-white
img.save('public/assets/floating_robot/hit_texture.png')
```

### 2. Register the Asset

Add to `src/assets/AssetRegistry.ts`:

```typescript
robot_hit_particle: {
  key: 'robot_hit_particle',
  path: 'assets/floating_robot/hit_texture.png',
  type: 'image' as const,
},
```

Add to default assets in `src/assets/AssetLoader.ts`:

```typescript
const keysToLoad: AssetKey[] = keys || [
  'player', 
  'floating_robot', 
  'robot_hit_particle',  // Add here
  // ... other assets
];
```

### 3. Create a Particle Component

Create `src/ecs/components/RobotHitParticlesComponent.ts`:

```typescript
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

export class RobotHitParticlesComponent implements Component {
  entity!: Entity;
  private scene: Phaser.Scene;
  private activeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    // Emitters created on demand
  }

  update(_delta: number): void {
    // Update emitter positions to follow entity
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    this.activeEmitters.forEach(emitter => {
      if (emitter.active) {
        emitter.setPosition(transform.x, transform.y);
      }
    });
  }

  emitHitParticles(bulletDirX: number, bulletDirY: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    const angle = Math.atan2(bulletDirY, bulletDirX) * 180 / Math.PI;
    
    const emitter = this.scene.add.particles(transform.x, transform.y, 'robot_hit_particle', {
      speed: { min: 80, max: 200 },
      angle: { min: angle - 45, max: angle + 45 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      frequency: 20,
      blendMode: 'ADD'
    });
    
    emitter.setDepth(1000);
    this.activeEmitters.push(emitter);
    
    // Stop emitting after 200ms
    this.scene.time.delayedCall(200, () => {
      emitter.stop();
    });
    
    // Destroy emitter after all particles fade out
    this.scene.time.delayedCall(1000, () => {
      const index = this.activeEmitters.indexOf(emitter);
      if (index > -1) {
        this.activeEmitters.splice(index, 1);
      }
      emitter.destroy();
    });
  }

  onDestroy(): void {
    this.activeEmitters.forEach(emitter => emitter.destroy());
    this.activeEmitters = [];
  }
}
```

### 4. Add Component to Entity

In the entity creation function (e.g., `StalkingRobotEntity.ts`):

```typescript
import { RobotHitParticlesComponent } from '../ecs/components/RobotHitParticlesComponent';

export function createStalkingRobotEntity(props: CreateStalkingRobotProps): Entity {
  // ... other components
  
  entity.add(new RobotHitParticlesComponent(scene));
  
  // Add to update order so particles follow the entity
  entity.setUpdateOrder([
    TransformComponent,
    // ... other components
    RobotHitParticlesComponent,
    StateMachineComponent,
  ]);
  
  return entity;
}
```

### 5. Trigger Particles on Event

In the collision handler or wherever you want to trigger particles:

```typescript
entity.add(new CollisionComponent({
  box: ROBOT_ENTITY_COLLISION_BOX,
  collidesWith: ['player_projectile'],
  onHit: (other) => {
    if (other.tags.has('player_projectile')) {
      // Emit hit particles
      const hitParticles = entity.get(RobotHitParticlesComponent);
      const projectile = other.get(ProjectileComponent);
      if (hitParticles && projectile) {
        hitParticles.emitHitParticles(projectile.dirX, projectile.dirY);
      }
      
      // ... other collision logic
    }
  }
}));
```

## Key Concepts

### Particle Ownership

**Particles should be owned by the entity they're attached to**, not by the projectile or other triggering entity. This ensures:
- Particles follow the entity's transform
- Particles are properly cleaned up when the entity is destroyed
- Multiple hits can create multiple particle effects simultaneously

### Following Entity Transform

The `update()` method updates all active emitter positions to match the entity's current position:

```typescript
update(_delta: number): void {
  const transform = this.entity.get(TransformComponent);
  if (!transform) return;

  this.activeEmitters.forEach(emitter => {
    if (emitter.active) {
      emitter.setPosition(transform.x, transform.y);
    }
  });
}
```

### Emission Pattern

For a smooth fade-out effect:
1. Use `frequency` instead of `quantity` for continuous emission
2. Emit for a short duration (200ms)
3. Stop emission but let existing particles fade out
4. Each particle has its own lifespan with alpha fade

```typescript
const emitter = this.scene.add.particles(x, y, 'texture', {
  frequency: 20,      // Emit continuously every 20ms
  lifespan: 800,      // Each particle lives 800ms
  alpha: { start: 1, end: 0 },  // Fade out
});

// Stop emitting after 200ms
this.scene.time.delayedCall(200, () => emitter.stop());

// Destroy after all particles fade (200ms + 800ms)
this.scene.time.delayedCall(1000, () => emitter.destroy());
```

### Particle Configuration

Common particle emitter properties:

```typescript
{
  speed: { min: 80, max: 200 },        // Particle velocity range
  angle: { min: -45, max: 45 },        // Emission angle range (degrees)
  scale: { start: 0.8, end: 0 },       // Size over lifetime
  alpha: { start: 1, end: 0 },         // Opacity over lifetime
  lifespan: 800,                       // How long each particle lives (ms)
  frequency: 20,                       // Emit interval (ms) - continuous
  quantity: 8,                         // Number per emission - one-shot
  blendMode: 'ADD',                    // Additive blending for glow effect
}
```

### Blend Modes

- `'NORMAL'` - Standard blending
- `'ADD'` - Additive blending (creates glow effect, good for bright particles)
- `'MULTIPLY'` - Multiplicative blending (darkens)
- `'SCREEN'` - Screen blending (lightens)

### Cleanup

Always track active emitters and clean them up:

```typescript
private activeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

// When creating
this.activeEmitters.push(emitter);

// When destroying
onDestroy(): void {
  this.activeEmitters.forEach(emitter => emitter.destroy());
  this.activeEmitters = [];
}
```

## Common Patterns

### One-Shot Burst

For a single burst of particles (explosion, impact):

```typescript
const emitter = scene.add.particles(x, y, 'texture', {
  speed: { min: 100, max: 200 },
  angle: { min: 0, max: 360 },
  scale: { start: 1, end: 0 },
  alpha: { start: 1, end: 0 },
  lifespan: 1000,
  quantity: 20,  // Emit 20 particles at once
  blendMode: 'ADD'
});

scene.time.delayedCall(1000, () => emitter.destroy());
```

### Continuous Stream

For a continuous effect (thruster, fire):

```typescript
const emitter = scene.add.particles(x, y, 'texture', {
  speed: { min: 50, max: 100 },
  angle: { min: -10, max: 10 },
  scale: { start: 0.5, end: 0 },
  alpha: { start: 1, end: 0 },
  lifespan: 500,
  frequency: 10,  // Emit every 10ms
  blendMode: 'ADD'
});

// Stop when needed
emitter.stop();
```

### Directional Spray

For particles that follow a direction (bullet impact, debris):

```typescript
const angle = Math.atan2(dirY, dirX) * 180 / Math.PI;

const emitter = scene.add.particles(x, y, 'texture', {
  speed: { min: 80, max: 200 },
  angle: { min: angle - 45, max: angle + 45 },  // ±45° spread
  // ... other properties
});
```

## Troubleshooting

### Particles appear green/wrong color
- Ensure the texture is loaded in `AssetLoader.ts`
- Check the texture path in `AssetRegistry.ts`
- Verify the texture file exists

### Particles don't follow entity
- Add the particle component to the entity's `setUpdateOrder()`
- Ensure `update()` method updates emitter positions
- Check that `TransformComponent` is updated before the particle component

### Particles don't clean up
- Track emitters in an array
- Implement `onDestroy()` to destroy all emitters
- Remove emitters from the array after destroying them

### Performance issues
- Limit the number of active emitters
- Use shorter lifespans
- Reduce emission frequency
- Lower particle count

## Related Files

- `src/ecs/components/RobotHitParticlesComponent.ts` - Example particle component
- `src/robot/StalkingRobotEntity.ts` - Example of adding particle component to entity
- `src/assets/AssetRegistry.ts` - Asset registration
- `src/assets/AssetLoader.ts` - Asset loading
