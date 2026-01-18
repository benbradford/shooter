# Joystick System

## Overview

The joystick system provides touch/mouse-based movement controls for the player. When the user clicks/touches in the lower-left quadrant of the screen, a visual joystick appears and tracks their input, allowing 360-degree movement with momentum-based physics.

## Architecture

### Components

**TouchJoystickComponent**
- Handles pointer input (mouse/touch)
- Tracks joystick state (active, start position, current position)
- 50px max radius with 20px dead zone
- Only activates in lower-left screen quadrant
- Provides two input methods:
  - `getInputDelta()` - With deadzone (for movement)
  - `getRawInputDelta()` - Without deadzone (for facing direction)

**JoystickVisualsComponent**
- Renders the joystick UI
- Outer circle: 50px radius, yellow outline, transparent fill
- Inner circle: 20px radius, yellow filled
- Fixed to camera (scrollFactor = 0)
- High depth (2000+) to stay on top
- Automatically shows/hides based on joystick state

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
- **Quadrant activation**: Only lower-left to avoid conflicts with future UI
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

- Right quadrant can be used for attack/aim joystick
- Joystick appearance can be customized (colors, sizes)
- Multiple joysticks can coexist (movement, aiming, etc.)
- Touch zones can be configured per-entity
- Acceleration time and stop threshold can be made configurable
