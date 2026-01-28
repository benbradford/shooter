# Key Patterns for Dodging Bullets Development

Quick reference for common patterns used throughout the codebase.

## Visual HUD Components

### Pattern: Outer + Inner Circle + Sprite

Used for joystick visuals (movement and aim):

```typescript
export class JoystickVisualsComponent implements Component {
  entity!: Entity;
  private outerCircle!: Phaser.GameObjects.Arc;
  private innerCircle!: Phaser.GameObjects.Arc;
  private sprite!: Phaser.GameObjects.Sprite;
  private lastX: number = 0;
  private lastY: number = 0;
  private initialized: boolean = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly joystick: TouchJoystickComponent
  ) {}

  init(): void {
    // Outer circle - larger radius
    this.outerCircle = this.scene.add.circle(0, 0, this.joystick.maxRadius * SCALE);
    this.outerCircle.setStrokeStyle(5 * SCALE, COLOR);
    this.outerCircle.setFillStyle(0x000000, 0); // Transparent
    this.outerCircle.setDepth(2000);
    this.outerCircle.setScrollFactor(0); // Fixed to camera
    
    // Inner circle - smaller radius
    this.innerCircle = this.scene.add.circle(0, 0, this.joystick.innerRadius * SCALE);
    this.innerCircle.setStrokeStyle(3 * SCALE, COLOR);
    this.innerCircle.setFillStyle(0x000000, 0);
    this.innerCircle.setDepth(2000);
    this.innerCircle.setScrollFactor(0);
    
    // Sprite - centered in inner circle
    this.sprite = this.scene.add.sprite(0, 0, 'texture');
    this.sprite.setScale(SCALE);
    this.sprite.setDepth(2001); // Above circles
    this.sprite.setScrollFactor(0);
  }

  update(_delta: number): void {
    const state = this.joystick.getJoystickState();
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    if (state.active) {
      // Active: full opacity, follow touch
      this.outerCircle.setAlpha(1);
      this.innerCircle.setAlpha(1);
      this.sprite.setAlpha(1);
      
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;
      
      this.outerCircle.setPosition(state.startX, state.startY);
      this.innerCircle.setPosition(state.currentX, state.currentY);
      this.sprite.setPosition(state.currentX, state.currentY);
    } else {
      // Inactive: reduced opacity, persist at last position
      this.outerCircle.setAlpha(0.3);
      this.innerCircle.setAlpha(0.3);
      this.sprite.setAlpha(0.3);
      
      // Recalculate default until first touch (Android fix)
      if (!this.initialized || this.lastX === 0) {
        this.lastX = displayWidth * 0.15;
        this.lastY = displayHeight * 0.85;
      }
      
      this.outerCircle.setPosition(this.lastX, this.lastY);
      this.innerCircle.setPosition(this.lastX, this.lastY);
      this.sprite.setPosition(this.lastX, this.lastY);
    }
  }

  onDestroy(): void {
    this.outerCircle.destroy();
    this.innerCircle.destroy();
    this.sprite.destroy();
  }
}
```

**Key Points:**
- Outer circle: Fixed at start position
- Inner circle: Follows drag position
- Sprite: Centered in inner circle
- All use `setScrollFactor(0)` for HUD
- Depth: 2000 for circles, 2001 for sprite
- Alpha: 1.0 active, 0.3 inactive
- Persist at last position when not active
- Recalculate default position until first touch (Android)

## Auto-Aim System

### Pattern: Priority Chain

Used in `InputComponent` and `WalkComponent`:

```typescript
// In InputComponent
getAutoAimDirection(): { dx: number; dy: number } | null {
  const enemies = this.getEnemies();
  let nearestEnemy: Entity | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  
  for (const enemy of enemies) {
    const enemyTransform = enemy.get(TransformComponent);
    if (!enemyTransform) continue;
    
    const dx = enemyTransform.x - this.transform.x;
    const dy = enemyTransform.y - this.transform.y;
    const distance = Math.hypot(dx, dy);
    
    // Within range and has line of sight?
    if (distance < this.bulletMaxDistance && this.hasLineOfSight(enemyTransform.x, enemyTransform.y)) {
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
  }
  
  if (nearestEnemy) {
    const enemyTransform = nearestEnemy.require(TransformComponent);
    const dx = enemyTransform.x - this.transform.x;
    const dy = enemyTransform.y - this.transform.y;
    const length = Math.hypot(dx, dy);
    return { dx: dx / length, dy: dy / length };
  }
  
  return null;
}

// In WalkComponent (mode 1)
updateMode1(delta: number): void {
  const movementInput = this.inputComp.getInputDelta();
  const facingInput = this.inputComp.getRawInputDelta();
  
  // Priority: Manual aim > Auto-aim > Movement
  const manualAim = this.inputComp.getManualAimDirection();
  const autoAim = this.inputComp.getAutoAimDirection();
  
  if (manualAim) {
    this.updateFacingDirection(manualAim.dx, manualAim.dy);
  } else if (autoAim) {
    this.updateFacingDirection(autoAim.dx, autoAim.dy);
  } else if (facingInput.dx !== 0 || facingInput.dy !== 0) {
    this.updateFacingDirection(facingInput.dx, facingInput.dy);
  }
  
  // Movement physics
  const targetVelocity = this.calculateTargetVelocity(movementInput.dx, movementInput.dy);
  this.applyMomentum(targetVelocity, delta);
  this.applyStopThreshold();
}
```

**Key Points:**
- Check manual aim first (highest priority)
- Fall back to auto-aim if no manual aim
- Fall back to movement direction if no aim
- Auto-aim checks distance and line of sight
- Normalize direction vectors for consistent behavior

## Manual Aim Threshold

### Pattern: Distance-Based Mode Switch

Used in `AimJoystickComponent`:

```typescript
export class AimJoystickComponent implements Component {
  private manualAimThreshold: number = 70; // Distance from center
  private isManualAim: boolean = false;
  
  update(_delta: number): void {
    if (this.isActive) {
      const dx = this.currentX - this.startX;
      const dy = this.currentY - this.startY;
      const distance = Math.hypot(dx, dy);
      
      // Enter manual aim when dragged beyond threshold
      if (distance > this.manualAimThreshold) {
        this.isManualAim = true;
      } else {
        this.isManualAim = false;
      }
      
      // Clamp inner circle to stay within outer circle
      const maxDistance = this.maxRadius - this.innerRadius;
      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        this.currentX = this.startX + Math.cos(angle) * maxDistance;
        this.currentY = this.startY + Math.sin(angle) * maxDistance;
      }
    }
  }
  
  isManualAimActive(): boolean {
    return this.isActive && this.isManualAim;
  }
}
```

**Key Points:**
- Threshold = maxRadius - innerRadius (70px)
- Enter manual aim when distance > threshold
- Resume auto-aim when distance ≤ threshold
- Clamp inner circle to stay within outer circle
- Smooth transition between modes

## Component Init Pattern

### Pattern: Two-Phase Initialization

Used for components that create Phaser game objects:

```typescript
export class MyComponent implements Component {
  entity!: Entity;
  private sprite!: Phaser.GameObjects.Sprite;
  
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly texture: string
  ) {}
  
  init(): void {
    // Create Phaser objects after entity is set
    this.sprite = this.scene.add.sprite(0, 0, this.texture);
    this.sprite.setScrollFactor(0);
    this.sprite.setDepth(2000);
  }
  
  update(_delta: number): void {
    // Update logic
  }
  
  onDestroy(): void {
    this.sprite.destroy();
  }
}

// Usage
const component = entity.add(new MyComponent(scene, 'texture'));
component.init(); // Must call after add()
```

**Why Two Phases:**
- Constructor: Store dependencies
- `init()`: Create Phaser objects (needs `this.entity` to be set)
- `entity.add()` sets `this.entity` reference
- Always call `init()` immediately after `add()`

## Android Display Size Fix

### Pattern: Recalculate Until Ready

Used in all HUD visual components:

```typescript
update(): void {
  const displayWidth = this.scene.scale.displaySize.width;
  const displayHeight = this.scene.scale.displaySize.height;
  
  // Recalculate default position until first interaction
  if (!this.initialized || this.lastX === 0) {
    this.lastX = displayWidth * 0.15;
    this.lastY = displayHeight * 0.85;
  }
  
  this.element.setPosition(this.lastX, this.lastY);
}
```

**Why:**
- On Android, `displaySize` may be `0x0` for first few frames
- Desktop/Mac: Available immediately
- Solution: Recalculate every frame until first touch
- After first touch, use last known position

## Collision Box Patterns

### Pattern: Two Separate Boxes

Entities need different boxes for different collision types:

```typescript
// Grid collision (wall detection)
const GRID_COLLISION_BOX = { 
  offsetX: 0,           // Relative to cell top-left
  offsetY: 16, 
  width: 48, 
  height: 32 
};

// Entity collision (damage, interaction)
const ENTITY_COLLISION_BOX = { 
  offsetX: -24,         // Relative to entity center (negative = left)
  offsetY: 16, 
  width: 48, 
  height: 32 
};

// Usage
entity.add(new GridPositionComponent(col, row, GRID_COLLISION_BOX));
entity.add(new CollisionComponent({
  box: ENTITY_COLLISION_BOX,
  collidesWith: ['enemy'],
  onHit: (other) => { /* ... */ }
}));
```

**Why Two Boxes:**
- Grid collision: Aligned with grid cells for wall detection
- Entity collision: Centered for accurate hit detection
- Different sizes optimize for different purposes

## Related Documentation

- [Input Systems](./input-systems.md) - Full joystick and control mode details
- [Screen Scaling and HUD](./screen-scaling-and-hud.md) - Android fixes and coordinate systems
- [ECS Architecture](./ecs-architecture.md) - Component lifecycle and patterns
- [Collision System](./collision-system.md) - Collision box usage
