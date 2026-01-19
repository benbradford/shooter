# Component Props Pattern

Components now use props objects instead of long parameter lists for better maintainability and reusability.

## Refactored Components

### AmmoComponent

```typescript
interface AmmoProps {
  maxAmmo?: number;
  refillRate?: number;
  refillDelay?: number;
}

// Usage
new AmmoComponent()  // Defaults: 20 ammo, 10/s refill, 2s delay
new AmmoComponent({ maxAmmo: 30, refillRate: 15 })  // Custom values
```

### HealthComponent

```typescript
interface HealthProps {
  maxHealth?: number;
}

// Usage
new HealthComponent()  // Default: 100 health
new HealthComponent({ maxHealth: 200 })  // Boss with 200 health
```

### WalkComponent

```typescript
interface WalkProps {
  speed?: number;
  accelerationTime?: number;
  stopThreshold?: number;
}

// Usage
new WalkComponent(transform, input)  // Defaults: 300 speed, 300ms accel
new WalkComponent(transform, input, { speed: 400, accelerationTime: 200 })  // Fast enemy
```

### ProjectileComponent

```typescript
interface ProjectileProps {
  dirX: number;
  dirY: number;
  speed: number;
  maxDistance: number;
  grid: Grid;
  blockedByWalls?: boolean;
  startLayer?: number;
  fromTransition?: boolean;
}

// Usage
new ProjectileComponent({
  dirX: 1,
  dirY: 0,
  speed: 800,
  maxDistance: 700,
  grid,
  blockedByWalls: true
})
```

### ProjectileEmitterComponent

```typescript
interface ProjectileEmitterProps {
  scene: Phaser.Scene;
  onFire: (x: number, y: number, dirX: number, dirY: number) => void;
  offsets: Record<Direction, EmitterOffset>;
  shouldFire: () => boolean;
  cooldown?: number;
  onShellEject?: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void;
  ammoComponent?: AmmoComponent;
}

// Usage
new ProjectileEmitterComponent({
  scene,
  onFire,
  offsets: emitterOffsets,
  shouldFire: () => input.isFirePressed(),
  cooldown: 200,
  onShellEject,
  ammoComponent: ammo
})
```

### TouchJoystickComponent

```typescript
interface TouchJoystickProps {
  maxRadius?: number;
  innerRadius?: number;
  deadZoneDistance?: number;
}

// Usage
new TouchJoystickComponent(scene)  // Defaults: 100 max, 60 inner, 60 deadzone
new TouchJoystickComponent(scene, { maxRadius: 120, innerRadius: 70 })  // Larger joystick
```

## Benefits

1. **Named parameters**: Clear what each value represents
2. **Optional parameters**: Easy to provide defaults
3. **Extensibility**: Add new props without breaking existing code
4. **Readability**: Self-documenting at call sites
5. **Reusability**: Same component works for different entity types

## Example: Creating Different Entity Types

```typescript
// Fast player
entity.add(new WalkComponent(transform, input, { speed: 400, accelerationTime: 200 }));
entity.add(new HealthComponent({ maxHealth: 100 }));
entity.add(new AmmoComponent({ maxAmmo: 30, refillRate: 15 }));

// Slow tank enemy
entity.add(new WalkComponent(transform, input, { speed: 150, accelerationTime: 500 }));
entity.add(new HealthComponent({ maxHealth: 500 }));

// Fast scout enemy
entity.add(new WalkComponent(transform, input, { speed: 450, accelerationTime: 100 }));
entity.add(new HealthComponent({ maxHealth: 50 }));
```

## Migration Guide

**Before:**
```typescript
new WalkComponent(transform, input, 300, 300, 50)
new AmmoComponent()  // Hardcoded values
new ProjectileComponent(dirX, dirY, 800, 700, grid, true, layer, fromTransition)
```

**After:**
```typescript
new WalkComponent(transform, input, { speed: 300, accelerationTime: 300, stopThreshold: 50 })
new AmmoComponent({ maxAmmo: 20, refillRate: 10, refillDelay: 2000 })
new ProjectileComponent({ dirX, dirY, speed: 800, maxDistance: 700, grid, blockedByWalls: true, startLayer: layer, fromTransition })
```

All props have sensible defaults, so you only need to specify what differs from the default behavior.
