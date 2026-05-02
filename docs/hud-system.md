# HUD and Input Systems

## Overview

The HUD (Heads-Up Display) is rendered in a separate Phaser scene (`HudScene`) that overlays the main game scene. This ensures UI elements remain fixed on screen regardless of camera movement.

## HUD Components

### Joystick (Mobile/Touch)

- **Visual**: Base circle and thumb stick
- **Position**: Bottom-left corner
- **Component**: `JoystickVisualsComponent`
- **Behavior**: 
  - Appears on touch
  - Returns to center when released
  - Provides directional input to player

### Attack Button (Punch/Crosshair)

- **Visual**: Stone ring frame + dark bg plate + fist/lips/push/jump icon
- **Position**: Bottom-right (89%, 79%)
- **Component**: `AttackButtonComponent`
- **Alpha States**:
  - Unpressed: 0.9 (near-opaque)
  - Pressed: 1.0 (full)
- **Keyboard**: Space bar
- **Layers** (bottom to top): shadow → stone ring → dark plate → icon
- **Icon overrides**: `setIconOverride('push')` for pushable contact, `setIconOverride('jump')` for void/platform edges. Override suppresses punch via `InputComponent.isAttackPressed()` returning false when override is `'jump'`.

### Slide Button (Dash)

- **Visual**: Stone ring frame + dark bg plate + slide icon
- **Position**: Bottom-right (68%, 85%)
- **Component**: `SlideButtonComponent`
- **Alpha States**:
  - Unpressed (ready): 0.9 (near-opaque)
  - Pressed: 1.0 (full)
  - Cooldown: 0.3 (faded)
- **Cooldown**: Cannot slide while punching or during cooldown period
- **Cooldown arc**: White arc overlay shows cooldown progress

### Health Bar

- **Position**: Top-left, follows player
- **Component**: `HudBarComponent`
- **Display**: Red bar showing current/max health

## Toggle HUD

Press **V** to toggle HUD visibility. This hides/shows:
- Joystick
- Attack button
- Slide button
- Health bar

## Implementation Details

### Scene Structure

```typescript
// HudScene.ts
export default class HudScene extends Phaser.Scene {
  private entityManager: EntityManager;
  private joystickEntity: Entity;
  
  create(): void {
    this.entityManager = new EntityManager();
    this.joystickEntity = createJoystickEntity(this);
    this.entityManager.add(this.joystickEntity);
  }
  
  update(time: number, delta: number): void {
    this.entityManager.update(delta);
  }
}
```

### Button Alpha Management

Buttons use stone ring frames with dark background plates. Alpha applies to all layers (shadow, ring, bg, icon) simultaneously:

```typescript
// AttackButtonComponent.ts
const ALPHA_UNPRESSED = 0.9;
const ALPHA_PRESSED = 1;
```

```typescript
// SlideButtonComponent.ts
const BUTTON_ALPHA_UNPRESSED = 0.9;
const BUTTON_ALPHA_PRESSED = 1;
const BUTTON_ALPHA_COOLDOWN = 0.3;
```

### Coordinate System

HUD elements use **screen coordinates** (0-1 normalized):
- `setScrollFactor(0)` - Prevents camera scrolling
- Position calculated as percentage of viewport: `viewWidth * POS_X`
- Depth set to 2000+ to render above game objects

### Touch Input Handling

```typescript
// Pointer tracking for multi-touch
private pointerId = -1;

private handlePointerDown(pointer: Phaser.Input.Pointer): void {
  if (this.pointerId === -1) {
    this.pointerId = pointer.id;
    this.isPressed = true;
  }
}

private handlePointerUp(pointer: Phaser.Input.Pointer): void {
  if (pointer.id === this.pointerId) {
    this.pointerId = -1;
    this.isPressed = false;
  }
}
```

## Adding New HUD Elements

1. **Create component** in `src/ecs/components/ui/`
2. **Add to joystick entity** or player entity
3. **Set scroll factor to 0**: `sprite.setScrollFactor(0)`
4. **Set high depth**: `sprite.setDepth(Depth.hud)`
5. **Use normalized positions**: `viewWidth * 0.5` for center

## Common Issues

### HUD not visible
- Check depth values (should be > 1000)
- Verify `setScrollFactor(0)` is set
- Ensure HudScene is launched: `scene.launch('HudScene')`

### Buttons not responding
- Verify `setInteractive()` is called
- Check pointer event handlers are registered
- Ensure button is within viewport bounds

### Alpha not updating
- Check update() is being called each frame
- Verify alpha constants are defined
- Ensure state logic is correct (pressed/unpressed/cooldown)
