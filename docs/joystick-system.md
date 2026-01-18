# Joystick System

## Overview

The joystick system provides touch/mouse-based movement controls for the player. When the user clicks/touches in the lower-left quadrant of the screen, a visual joystick appears and tracks their input, allowing 360-degree movement.

## Architecture

### Components

**TouchJoystickComponent**
- Handles pointer input (mouse/touch)
- Tracks joystick state (active, start position, current position)
- Calculates normalized input delta (-1 to 1 range)
- 50px max radius with 5px dead zone
- Only activates in lower-left screen quadrant

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
- `setJoystick()` method connects to TouchJoystickComponent
- `getInputDelta()` returns normalized direction vector

**WalkComponent**
- Already supports continuous direction (no changes needed)
- Normalizes input vector for consistent speed
- Uses `dirFromDelta()` to select closest of 8 sprite directions

**Direction Selection**
- `dirFromDelta()` converts any angle to nearest 8-direction
- Uses 45-degree sectors (±22.5 degrees per direction)
- Player sprite automatically matches movement angle

## Entity Structure

```typescript
// Joystick Entity
createJoystickEntity(scene)
  ├─ TouchJoystickComponent (input handling)
  └─ JoystickVisualsComponent (rendering)

// Player Entity (updated)
createPlayerEntity(scene, x, y, grid, onFire, onShellEject, joystick)
  ├─ InputComponent (connected to joystick)
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

## Behavior

1. User clicks/touches lower-left quadrant
2. Outer circle appears at touch point (fixed)
3. Inner circle tracks finger/mouse position (clamped to outer circle)
4. Player moves in direction of inner circle offset
5. Sprite direction selected from 8 options based on angle
6. On release, joystick disappears and player returns to idle

## Key Features

- **Continuous movement**: 360-degree control, not limited to 8 directions
- **Visual feedback**: Clear joystick UI shows input state
- **Dual input**: Keyboard controls still work alongside joystick
- **Quadrant activation**: Only lower-left to avoid conflicts with future UI
- **Component reusability**: Joystick is separate entity, can be reused
- **Smooth animation**: Existing direction system selects best sprite match

## Future Extensions

- Right quadrant can be used for attack/aim joystick
- Joystick appearance can be customized (colors, sizes)
- Multiple joysticks can coexist (movement, aiming, etc.)
- Touch zones can be configured per-entity
