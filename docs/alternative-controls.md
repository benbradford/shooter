# Alternative Control System (Mode 2)

## Overview

The game now supports two control modes that can be switched by pressing **1** or **2**:

- **Mode 1** (Default): Original crosshair button system
- **Mode 2** (Alternative): Dual joystick system with aiming

## Mode 1: Crosshair Button (Original)

**Movement**: Touch joystick in lower-left quadrant (yellow circles)
**Firing**: Tap/hold crosshair button in lower-right area

**Behavior**:
- Player stops moving when firing (after 200ms hold)
- Faces the direction of movement
- Crosshair button visible

## Mode 2: Dual Joystick (Alternative)

**Movement**: Touch joystick in lower-left quadrant (yellow circles)
**Aiming/Firing**: Touch joystick in lower-right quadrant (blue circles)

**Behavior**:
- Player continues moving while firing
- Tap lower-right quadrant: Fire in current facing direction
- Hold and drag lower-right quadrant: Aim and fire continuously
- Aiming overrides facing direction
- After releasing aim joystick, character snaps back to facing movement direction after 1 second cooldown

**Visual Feedback**:
- Blue circles appear when aiming (same style as movement joystick)
- Crosshair button hidden in mode 2

## Switching Modes

Press **1** or **2** on keyboard to switch between modes. Console logs the current mode.

## Implementation Details

### New Components

**AimJoystickComponent** (`src/ecs/components/AimJoystickComponent.ts`)
- Handles touch input in lower-right quadrant
- Provides aim direction delta
- Similar to TouchJoystickComponent but for aiming

**AimJoystickVisualsComponent** (`src/ecs/components/AimJoystickVisualsComponent.ts`)
- Renders blue circles for aim joystick
- Only visible in mode 2

**ControlModeComponent** (`src/ecs/components/ControlModeComponent.ts`)
- Tracks current mode (1 or 2)
- Manages 1-second cooldown after aiming stops
- Listens for 1/2 key presses

### Modified Components

**InputComponent**
- Added `getAimDelta()` - returns aim joystick direction
- Added `isAiming()` - checks if actively aiming
- `isFirePressed()` now mode-aware (crosshair in mode 1, aim joystick in mode 2)

**WalkComponent**
- Mode 1: Stops movement when firing (original behavior)
- Mode 2: Continues movement while aiming
- Mode 2: Aiming overrides facing direction
- Mode 2: Snaps back to movement direction after 1s cooldown

**ProjectileEmitterComponent**
- Tracks when aiming stops to trigger cooldown

**CrosshairVisualsComponent**
- Hides crosshair in mode 2

### Entity Updates

**JoystickEntity** (`src/hud/JoystickEntity.ts`)
- Now includes AimJoystickComponent, AimJoystickVisualsComponent, and ControlModeComponent

**PlayerEntity** (`src/player/PlayerEntity.ts`)
- Wires up aim joystick and control mode to InputComponent and WalkComponent

## Testing

1. Start game (defaults to mode 1)
2. Press **2** to switch to mode 2
3. Move with lower-left joystick
4. Aim/fire with lower-right joystick
5. Observe:
   - Player continues moving while aiming
   - Blue circles appear when aiming
   - Character faces aim direction while aiming
   - Character snaps back to movement direction 1s after releasing aim
6. Press **1** to switch back to mode 1
7. Observe:
   - Crosshair button reappears
   - Blue aim joystick hidden
   - Player stops when firing (original behavior)
