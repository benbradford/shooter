# Screen Scaling and HUD Positioning

This document covers critical quirks and best practices for handling screen scaling, coordinate systems, and HUD positioning across different platforms (desktop, mobile, Android, iOS).

## Critical Constraints

### Camera Zoom Must Stay at 1
**Camera zoom MUST always be 1.** Any zoom breaks touch coordinate alignment.

```typescript
// In GameScene.ts
this.cameras.main.setZoom(1); // NEVER change this
```

**Why:** Touch input coordinates (`pointer.x/y`) are in screen space, but zooming the camera causes misalignment between screen coordinates and world coordinates. This breaks touch joystick positioning and all HUD interactions.

### Use FIT Mode with Fixed Resolution
**Always use `Phaser.Scale.FIT` mode with a fixed resolution.** Never use `RESIZE` mode.

```typescript
// In main.ts
scale: {
  mode: Phaser.Scale.FIT,
  width: 1280,
  height: 720,
  autoCenter: Phaser.Scale.CENTER_BOTH
}
```

**Why:** `RESIZE` mode causes the game canvas to constantly change dimensions, breaking touch input coordinate calculations. `FIT` mode maintains a consistent coordinate system while scaling to fit the screen.

### Resolution: 1280x720 (16:9)
The game uses **1280x720** resolution to match modern phone aspect ratios (16:9 landscape).

## Coordinate Systems

### Screen Coordinates vs World Coordinates

- **Screen coordinates:** `pointer.x`, `pointer.y` - relative to the visible screen (0,0 at top-left)
- **World coordinates:** `pointer.worldX`, `pointer.worldY` - relative to the game world (accounts for camera scroll)

**For HUD elements:** Always use screen coordinates (`pointer.x/y`) and set `setScrollFactor(0)` on the game objects.

**For game world elements:** Use world coordinates (`pointer.worldX/worldY`).

### Display Size vs Game Size

```typescript
// Game size (fixed resolution)
const gameWidth = this.cameras.main.width;  // 1280
const gameHeight = this.cameras.main.height; // 720

// Display size (actual screen pixels)
const displayWidth = this.scene.scale.displaySize.width;
const displayHeight = this.scene.scale.displaySize.height;
```

**For HUD positioning:** Always use `displaySize` for percentage-based positioning.

## HUD Positioning Best Practices

### Always Use ScrollFactor(0)
HUD elements must be fixed to the camera:

```typescript
this.hudElement.setScrollFactor(0);
this.hudElement.setDepth(2000); // High depth for HUD layer
```

### Percentage-Based Positioning
Use percentages of `displaySize` for responsive positioning:

```typescript
const displayWidth = this.scene.scale.displaySize.width;
const displayHeight = this.scene.scale.displaySize.height;

// Bottom-left corner
const x = displayWidth * 0.15;
const y = displayHeight * 0.85;
```

### Android Display Size Quirk
**Critical:** On Android, `displaySize` may not be ready at initialization time.

**Solution:** Recalculate positions every frame until first interaction:

```typescript
update(): void {
  const displayWidth = this.scene.scale.displaySize.width;
  const displayHeight = this.scene.scale.displaySize.height;
  
  // Recalculate until user touches (lastX will be 0 initially)
  if (!this.initialized || this.lastX === 0) {
    this.lastX = displayWidth * 0.15;
    this.lastY = displayHeight * 0.85;
  }
  
  this.element.setPosition(this.lastX, this.lastY);
}
```

**Why:** On desktop/Mac, `displaySize` is available immediately. On Android, it may be `0x0` for the first few frames until the browser/WebView finishes layout.

## Touch Joystick Implementation

### Joystick Positioning Pattern

```typescript
export class JoystickVisualsComponent {
  private lastX: number = 0;
  private lastY: number = 0;
  private initialized: boolean = false;

  update(): void {
    const displayWidth = this.scene.scale.displaySize.width;
    const displayHeight = this.scene.scale.displaySize.height;

    if (state.active) {
      // User is touching - remember this position
      this.lastX = state.startX;
      this.lastY = state.startY;
      this.initialized = true;
      this.element.setPosition(state.startX, state.startY);
    } else {
      // Not touching - use last position or default
      if (!this.initialized || this.lastX === 0) {
        // Recalculate default (handles Android delay)
        this.lastX = displayWidth * 0.15;
        this.lastY = displayHeight * 0.85;
      }
      this.element.setPosition(this.lastX, this.lastY);
    }
  }
}
```

### Joystick Default Positions

- **Movement joystick:** Bottom-left (15% from left, 55% from top)
- **Aim joystick:** Bottom-right (65% from left, 55% from top)

These positions are chosen to:
1. Be easily reachable with thumbs in landscape mode
2. Not overlap with game content
3. Stay visible above browser UI elements

### Multi-Touch Support

Track pointers by ID, not by reference:

```typescript
private pointerId: number = -1;

this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (this.pointerId === -1) {
    this.pointerId = pointer.id; // Track by ID
    // ... handle touch
  }
});

this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  if (pointer.id === this.pointerId) { // Compare IDs
    // ... handle move
  }
});
```

**Why:** Pointer objects are reused by Phaser. Tracking by reference breaks when multiple fingers are on screen.

## Common Pitfalls

### ❌ Don't: Use pointer.worldX/Y for HUD
```typescript
// WRONG - worldX/Y accounts for camera scroll
this.hudElement.setPosition(pointer.worldX, pointer.worldY);
```

### ✅ Do: Use pointer.x/y for HUD
```typescript
// CORRECT - screen coordinates for HUD
this.hudElement.setPosition(pointer.x, pointer.y);
this.hudElement.setScrollFactor(0);
```

### ❌ Don't: Calculate positions once at init
```typescript
// WRONG - breaks on Android
constructor() {
  this.x = this.scene.scale.displaySize.width * 0.5; // May be 0!
}
```

### ✅ Do: Calculate positions in update loop
```typescript
// CORRECT - recalculates until ready
update() {
  const x = this.scene.scale.displaySize.width * 0.5;
  this.element.setPosition(x, y);
}
```

### ❌ Don't: Use camera zoom
```typescript
// WRONG - breaks touch coordinates
this.cameras.main.setZoom(1.5);
```

### ✅ Do: Keep zoom at 1
```typescript
// CORRECT - always zoom 1
this.cameras.main.setZoom(1);
```

## Testing Checklist

When implementing HUD elements, test:

1. **Desktop browser** - Should work immediately
2. **Android Chrome** - Check first few frames, ensure positions are correct
3. **iOS Safari** - Check landscape orientation handling
4. **Multi-touch** - Test two fingers simultaneously (movement + aim)
5. **Screen rotation** - Ensure positions recalculate (if supporting portrait)
6. **Different aspect ratios** - Test on various phone sizes

## Related Files

- `src/main.ts` - Game config (resolution, scale mode)
- `src/GameScene.ts` - Camera setup (zoom = 1)
- `src/ecs/components/TouchJoystickComponent.ts` - Movement joystick with multi-touch
- `src/ecs/components/AimJoystickComponent.ts` - Aim joystick with multi-touch
- `src/ecs/components/JoystickVisualsComponent.ts` - Movement joystick HUD rendering
- `src/ecs/components/AimJoystickVisualsComponent.ts` - Aim joystick HUD rendering
- `src/ecs/components/CrosshairVisualsComponent.ts` - Crosshair HUD rendering

## Summary

**Golden Rules:**
1. Camera zoom = 1 (never change)
2. Use FIT mode with 1280x720 resolution
3. HUD elements: `setScrollFactor(0)` + screen coordinates
4. Use `displaySize` for percentage-based positioning
5. Recalculate positions every frame until first interaction (Android fix)
6. Track touch pointers by ID, not reference
7. Test on Android - desktop behavior is not representative
