# Visual Effects Guide

This guide covers visual feedback systems: hit flashes, particle effects, and animations.

## Hit Flash System

The `HitFlashComponent` provides standardized red flash when entities take damage.

### Component Behavior

- **Flash color:** Light red (`0xff8888`)
- **Flash interval:** 100ms (alternates between red and normal)
- **Duration:** Configurable (typically 300ms)
- **Auto-stop:** Automatically stops after duration

### Usage

```typescript
// Add to entity
entity.add(new HitFlashComponent());

// Trigger on damage
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(300); // Flash for 300ms
}
```

### Integration Patterns

**Simple damage flash:**
```typescript
entity.add(new HitFlashComponent());

// In collision handler
const hitFlash = entity.get(HitFlashComponent);
if (hitFlash) {
  hitFlash.flash(300);
}
```

**State-based flash:**
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

## Particle Effects

Particle effects can be created using callbacks in ProjectileComponent or directly in collision handlers.

### Using ProjectileComponent Callbacks

For projectiles that should create effects when hitting walls or reaching max distance:

```typescript
entity.add(new ProjectileComponent({
  dirX,
  dirY,
  speed: 400,
  maxDistance: 2000,
  grid,
  startLayer: 0,
  fromTransition: false,
  scene,
  onWallHit: (x, y) => createBurstEffect(scene, x, y),
  onMaxDistance: (x, y) => createBurstEffect(scene, x, y)
}));

function createBurstEffect(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add.particles(x, y, 'fire', {
    speed: { min: 80, max: 150 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.05, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xff8800, 0xff0000],
    lifespan: 400,
    frequency: 3,
    blendMode: 'ADD'
  });

  emitter.setDepth(1000);
  scene.time.delayedCall(100, () => emitter.stop());
  scene.time.delayedCall(500, () => emitter.destroy());
}
```

### Using Collision Handlers

For effects when hitting specific entity types:

```typescript
entity.add(new CollisionComponent({
  collidesWith: ['player'],
  onHit: (other) => {
    if (other.tags.has('player')) {
      const transform = entity.require(TransformComponent);
      createBurstEffect(scene, transform.x, transform.y);
      scene.time.delayedCall(0, () => entity.destroy());
    }
  }
}));
```

### Sharing Effect Code

Extract particle effects into shared functions to avoid duplication:

```typescript
// At top of file
function createFireballBurst(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add.particles(x, y, 'fire', {
    speed: { min: 80, max: 150 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.05, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xff8800, 0xff0000],
    lifespan: 400,
    frequency: 3,
    blendMode: 'ADD'
  });

  emitter.setDepth(1000);
  scene.time.delayedCall(100, () => emitter.stop());
  scene.time.delayedCall(500, () => emitter.destroy());
}

// Use in multiple places
entity.add(new ProjectileComponent({
  // ...
  onWallHit: (x, y) => createFireballBurst(scene, x, y),
  onMaxDistance: (x, y) => createFireballBurst(scene, x, y)
}));

entity.add(new CollisionComponent({
  onHit: (other) => {
    const transform = entity.require(TransformComponent);
    createFireballBurst(scene, transform.x, transform.y);
    scene.time.delayedCall(0, () => entity.destroy());
  }
}));
```

**Benefits:**
- Single source of truth for effect appearance
- Easy to tweak effect parameters
- No code duplication
- Consistent effects across all destruction scenarios

### Particle Configuration

**Common properties:**
```typescript
{
  speed: { min: 80, max: 200 },        // Velocity range
  angle: { min: -45, max: 45 },        // Emission angle (degrees)
  scale: { start: 0.8, end: 0 },       // Size over lifetime
  alpha: { start: 1, end: 0 },         // Opacity over lifetime
  lifespan: 800,                       // Particle lifetime (ms)
  frequency: 20,                       // Emit interval (ms) - continuous
  quantity: 8,                         // Number per emission - one-shot
  tint: [0x000000, 0xff0000],         // Color tints
  blendMode: 'ADD',                    // Additive blending for glow
}
```

### Emission Patterns

**One-shot burst (explosion, impact):**
```typescript
const emitter = scene.add.particles(x, y, 'texture', {
  speed: { min: 100, max: 200 },
  angle: { min: 0, max: 360 },
  scale: { start: 1, end: 0 },
  alpha: { start: 1, end: 0 },
  lifespan: 1000,
  quantity: 20,  // Emit 20 at once
  blendMode: 'ADD'
});

scene.time.delayedCall(1000, () => emitter.destroy());
```

**Continuous stream (thruster, fire):**
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

**Directional spray (bullet impact, debris):**
```typescript
const angle = Math.atan2(dirY, dirX) * 180 / Math.PI;

const emitter = scene.add.particles(x, y, 'texture', {
  speed: { min: 80, max: 200 },
  angle: { min: angle - 45, max: angle + 45 },  // ±45° spread
  scale: { start: 0.8, end: 0 },
  alpha: { start: 1, end: 0 },
  lifespan: 800,
  frequency: 20,
  blendMode: 'ADD'
});

scene.time.delayedCall(200, () => emitter.stop());
scene.time.delayedCall(1000, () => emitter.destroy());
```

### Key Concepts

**Callback-based particle effects:**
- Use ProjectileComponent callbacks (`onWallHit`, `onMaxDistance`)
- Use CollisionComponent callbacks (`onHit`)
- Extract shared effect functions to avoid duplication
- No need for particle components in most cases

**Smooth fade-out:**
1. Use `frequency` instead of `quantity` for continuous emission
2. Emit for short duration (100-200ms)
3. Stop emission but let existing particles fade
4. Each particle has its own lifespan with alpha fade

**Cleanup:**
- Particles created in callbacks are owned by the scene
- Use `scene.time.delayedCall()` to stop and destroy emitters
- No manual tracking needed for one-shot effects

### Blend Modes

- `'NORMAL'` - Standard blending
- `'ADD'` - Additive blending (glow effect, bright particles)
- `'MULTIPLY'` - Multiplicative blending (darkens)
- `'SCREEN'` - Screen blending (lightens)

### Depth Management for Direction-Based Rendering

Particle effects should render behind or in front of the player based on facing direction:

```typescript
update(_delta: number): void {
  const walk = this.entity.require(WalkComponent);
  const direction = walk.lastDir;
  
  // Facing up = particles behind player, other directions = in front
  const facingUp = direction === Direction.UpLeft || 
                   direction === Direction.Up || 
                   direction === Direction.UpRight;
  const depth = facingUp ? -1 : 1000;
  
  this.smokeParticles.setDepth(depth);
  this.fireParticles.setDepth(depth + 1); // Fire always above smoke
}
```

**Depth values:**
- `-1` - Behind player (for upward-facing effects)
- `1000+` - In front of player (for other directions)
- Layer multiple particle systems by incrementing depth

### Progressive Particle Effects

Create effects that scale with a value (health, ammo, etc.):

```typescript
update(_delta: number): void {
  const ammoRatio = this.ammoComponent.getRatio();
  
  if (ammoRatio >= 0.75) {
    // No effect at high ammo
    this.smokeParticles.emitting = false;
    this.fireParticles.emitting = false;
  } else if (ammoRatio > 0) {
    // Progressive smoke intensity as ammo decreases
    const intensity = 1 - (ammoRatio / 0.75);
    this.smokeParticles.frequency = 50 / (1 + intensity * 3);
    this.smokeParticles.emitting = true;
    this.fireParticles.emitting = false;
  } else {
    // Heavy smoke + fire at 0 ammo
    this.smokeParticles.frequency = 10;
    this.smokeParticles.emitting = true;
    this.fireParticles.emitting = true;
  }
}
```

**Key points:**
- Use `frequency` to control emission rate (lower = more particles)
- Combine multiple particle systems for layered effects
- Adjust depth dynamically based on entity state
- Effects automatically lessen as value increases

### Cleanup

Always track and clean up emitters:

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

## Shadows

Shadows are handled by the reusable `ShadowComponent`.

### Usage

```typescript
import { ShadowComponent } from '../ecs/components/ShadowComponent';

// In entity factory
const shadow = entity.add(new ShadowComponent(scene, {
  scale: 2,        // Shadow size (required)
  offsetX: 0,      // Horizontal offset (required)
  offsetY: 50      // Vertical offset (required)
}));
shadow.init();  // Must call after add()
```

**Common configurations:**
- Player: `{ scale: 2, offsetX: -5, offsetY: 43 }`
- Robot: `{ scale: 2, offsetX: 0, offsetY: 60 }`
- Fireball: `{ scale: 1.4, offsetX: 0, offsetY: 50 }`

The shadow:
- Uses `shadow` texture from `assets/generic/shadow.png`
- Automatically follows entity position
- Renders at depth -1 (behind everything)

## Combining Effects

**Hit feedback with multiple effects:**
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

// Knockback
const knockback = entity.get(KnockbackComponent);
if (knockback) {
  knockback.applyKnockback(dirX, dirY, force);
}
```

## Troubleshooting

**Flash not visible:**
- Verify `HitFlashComponent` added to entity
- Check component in update order
- Ensure `flash()` being called
- Verify entity has `SpriteComponent`

**Particles don't follow entity:**
- Add particle component to update order
- Ensure `update()` updates emitter positions
- Check `TransformComponent` updated before particle component

**Particles don't clean up:**
- Track emitters in array
- Implement `onDestroy()` to destroy all emitters
- Remove emitters from array after destroying

**Particles don't fade:**
- Use `frequency` instead of `quantity`
- Set `alpha: { start: 1, end: 0 }`
- Stop emitting after duration, then destroy after lifespan

## Related Documentation

- [ECS Architecture](./ecs-architecture.md) - Component system overview
- [Collision System](./collision-system.md) - Trigger effects on collision
- [Adding Enemies](./adding-enemies.md) - Integrate into enemy entities
