# Input Systems

**Related Docs:**
- [ECS Architecture](./ecs-architecture.md) - Component system overview
- [Coding Standards](./coding-standards.md) - Component design principles

This document covers all input systems: joystick controls, keyboard input, and touch-based firing.

---

## Overview

The game supports dual input methods:
- **Keyboard**: WASD/Arrow keys for movement, Space for firing
- **Touch/Mouse**: Virtual joystick for movement, crosshair button for firing

Both systems work simultaneously and are integrated through the `InputComponent`.

---

## Movement Input

### Joystick System

The joystick system provides touch/mouse-based movement controls for the player. When the user clicks/touches the left side of the screen, a visual joystick appears and tracks their input, allowing 360-degree movement with momentum-based physics.

## Architecture

### Components

**TouchJoystickComponent**
- Handles pointer input (mouse/touch)
- Tracks joystick state (active, start position, current position)
- has a deadzone whereby the player changes direction but doesn't move until move distance is outside of deadzone
- Only activates on left side of screen
- Provides two input methods:
  - `getInputDelta()` - With deadzone (for movement)
  - `getRawInputDelta()` - Without deadzone (for facing direction)

**JoystickVisualsComponent**
- Renders the movement joystick UI
- Outer circle: larger radius (150px), grey outline, transparent fill
- Inner circle: smaller radius (80px), grey outline, transparent fill
- Arrows sprite: Shows directional arrows, follows drag position
- Fixed to camera (scrollFactor = 0)
- High depth (2000+) to stay on top
- Automatically shows/hides based on joystick state
- Alpha: 1.0 when active, 0.3 when inactive

**AimJoystickVisualsComponent**
- Renders the aim joystick UI
- Outer circle: larger radius (150px), blue outline, transparent fill
- Crosshair sprite: Scaled to 50%, stays centered in auto-aim, follows drag in manual aim
- Fixed to camera (scrollFactor = 0)
- High depth (2000+) to stay on top
- Persists at last position when not aiming (0.3 alpha)
- Crosshair returns to center when releasing aim

### Integration

**InputComponent**
- Updated to support both keyboard and joystick input
- Prioritizes joystick over keyboard when active
- `getInputDelta()` - Returns input with deadzone applied (for movement)
- `getRawInputDelta()` - Returns raw input without deadzone (for facing)
- `hasInput()` - Boolean check for any input

**WalkComponent**
- Handles momentum-based movement physics
- Uses raw input for instant facing direction updates
- Uses filtered input (with deadzone) for actual movement
- 300ms acceleration time to reach full speed
- 50 px/s stop threshold to prevent drift
- Normalizes input vector for consistent speed
- Uses `dirFromDelta()` to select closest of 8 sprite directions

**Direction Selection**
- `dirFromDelta()` converts any angle to nearest 8-direction
- Uses 45-degree sectors (±22.5 degrees per direction)
- Player sprite automatically matches movement angle

## Movement Behavior

### Momentum System

**Acceleration (0-300ms)**
- Takes 0.3 seconds to reach full speed from standstill
- Smooth lerp interpolation between current and target velocity
- Facing direction updates instantly (no delay)
- Animation plays at full speed during acceleration

**Direction Changes**
- Character faces new direction immediately (even in deadzone)
- Velocity smoothly transitions to new direction
- When reversing (e.g., left to right), player decelerates first, then accelerates in new direction
- Animation stays at full speed while input is active

**Deceleration**
- When input is released, velocity smoothly decreases
- Animation speed scales with velocity during deceleration
- Velocity below 50 px/s snaps to zero (prevents long drift)
- Transitions to idle state when fully stopped

### Deadzone Behavior

**Movement Deadzone (20px)**
- Joystick input within 20px of center is ignored for movement
- Character does not move until joystick leaves deadzone
- Prevents accidental micro-movements

**Facing Deadzone (0px)**
- Character facing direction updates immediately, even in movement deadzone
- Allows player to aim/face direction before moving
- Idle animation updates to face input direction
- Bullets fire in the direction character is facing

## Entity Structure

```typescript
// Joystick Entity
createJoystickEntity(scene)
  ├─ TouchJoystickComponent (input handling)
  └─ JoystickVisualsComponent (rendering)

// Player Entity (updated)
createPlayerEntity(scene, x, y, grid, onFire, onShellEject, joystick)
  ├─ InputComponent (connected to joystick)
  ├─ WalkComponent (momentum physics)
  └─ ... (other components)
```

## Usage

```typescript
// In GameScene.create()
this.joystick = createJoystickEntity(this);
this.player = createPlayerEntity(
  this, x, y, grid,
  onFire, onShellEject,
  this.joystick  // Pass joystick entity
);

// In GameScene.update()
this.joystick.update(delta);
this.player.update(delta);
```

## State Machine Integration

**PlayerIdleState**
- Monitors `walk.lastDir` for direction changes
- Updates idle animation when direction changes (even in deadzone)
- Transitions to walk state when `walk.isMoving()` returns true

**PlayerWalkState**
- Animation plays at full speed (1.0) while input is active
- Animation speed scales with velocity when input is released
- Transitions to idle when no input and velocity is zero

## Key Features

- **Instant facing response**: Character faces input direction immediately
- **Momentum-based movement**: Smooth acceleration and deceleration
- **Dual deadzone system**: Separate thresholds for facing vs movement
- **Visual feedback**: Clear joystick UI shows input state
- **Dual input support**: Keyboard controls work alongside joystick
- **Screen activation**: Only left side to avoid conflicts with aim joystick
- **Component reusability**: Joystick is separate entity, can be reused
- **Smooth animation**: Animation speed matches movement state

## Implementation Details

### Input Flow

1. **TouchJoystickComponent** tracks pointer position
2. **InputComponent** reads from joystick (or keyboard fallback)
3. **WalkComponent.update()** receives two inputs:
   - Raw input → Updates `lastDir`, `lastMoveX/Y` (facing)
   - Filtered input → Calculates target velocity (movement)
4. **Momentum system** interpolates current velocity toward target
5. **Stop threshold** snaps to zero when very slow
6. **Transform** updated with final velocity

### Direction Tracking

**WalkComponent** maintains two direction representations:
- `lastDir: Direction` - Discrete 8-direction enum (for sprite selection)
- `lastMoveX/Y: number` - Normalized vector (for bullet firing)

Both update from raw input, ensuring instant response to player intent.

## Future Extensions

- Right side can be used for attack/aim joystick
- Joystick appearance can be customized (colors, sizes)
- Multiple joysticks can coexist (movement, aiming, etc.)
- Touch zones can be configured per-entity
- Acceleration time and stop threshold can be made configurable

---

## Control System

**Movement:**
- Touch left half of screen → Movement joystick appears at touch location
- Drag to move in any direction
- Outer circle (grey) and inner circle with arrows sprite
- Inner circle follows drag, arrows show movement direction
- After releasing, joystick stays visible at last position with reduced alpha (0.3)

**Attack:**
- Touch right half of screen or press Space → Punch attack
- Fixed attack button at 80% width, 75% height
- Crosshair sprite with visual feedback on press
- Finds nearest enemy within 128px and punches them
- Player faces enemy during punch

---

## Attack Button System

### Attack Button Component

**AttackButtonComponent** renders a crosshair sprite in the lower-right area of the screen that acts as an attack button.

**Features:**
- Positioned at 80% screen width, 75% screen height
- Uses `crosshair.png` sprite asset
- Scaled to 0.8x by default
- Fixed to camera (doesn't scroll)
- High depth (2000) to stay on top
- Recalculates position every frame (Android compatibility)

**Visual Feedback:**
- **Normal state**: Default appearance with 0.7 alpha
- **Pressed state**: Scales up to 1.0x and applies blue tint (0x6666ff)
- Instant visual response when touched/held

### Touch Detection

**Circular Hit Area:**
- Touch detection uses circular collision based on sprite size
- Radius calculated from sprite dimensions × scale
- Only touches within the button circle register as attack input

### Integration with Input System

**InputComponent** checks both keyboard and touch attack inputs:
```typescript
isAttackPressed(): boolean {
  if (this.attackButton?.isAttackPressed()) {
    return true;
  }
  return false;
}
```

**Behavior:**
- Single tap/press: Triggers one punch
- Must release and press again for next punch
- Works with both touch and spacebar

### Entity Structure

```typescript
// Joystick Entity (includes movement and attack controls)
createJoystickEntity(scene)
  ├─ TouchJoystickComponent (handles movement input)
  ├─ JoystickVisualsComponent (movement joystick circles)
  └─ AttackButtonComponent (attack button)
```

---

## Keyboard Controls

### Movement
- **W / Up Arrow**: Move up
- **A / Left Arrow**: Move left
- **S / Down Arrow**: Move down
- **D / Right Arrow**: Move right
- Diagonal movement supported (normalized for consistent speed)

### Actions
- **Space**: Punch attack
- **G**: Toggle debug grid visualization

### Implementation

Keyboard input is handled by `InputComponent`:
```typescript
getInputDelta(): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
  if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
  if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
  if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
  return { dx, dy };
}
```

---

## Input Priority

When both keyboard and touch inputs are active:

**Movement:**
- Joystick input takes priority over keyboard
- If joystick is active (dx !== 0 || dy !== 0), keyboard is ignored
- If joystick is inactive, keyboard input is used

**Firing:**
- Touch crosshair and keyboard spacebar work independently
- Either input triggers firing
- No priority system needed (both can fire simultaneously)

---

## Summary

The input system provides flexible, dual-input controls:
- **Touch users**: Virtual joystick (lower-left) + crosshair button (lower-right)
- **Keyboard users**: WASD/Arrows + Space
- **Hybrid users**: Can mix and match (e.g., keyboard movement + touch firing)

All input is centralized through `InputComponent`, making it easy to add new input methods or change behavior without modifying gameplay code.
