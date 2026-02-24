# Attacker Spritesheet Layout

**File:** `public/assets/attacker/attacker-spritesheet.png`  
**Frame Size:** 56x56 pixels  
**Sheet Dimensions:** 672×2072 pixels (12×37 grid)
**Total Frames:** 440 frames

## Frame Layout

### Idle Rotations (Frames 0-7)
Single frame per direction, no animation.

**Critical:** Frame order is based on alphabetical sorting of source files, NOT Direction enum order.

| Frame | Direction    | Source File         | Direction Enum |
|-------|-------------|---------------------|----------------|
| 0     | East        | rotations/east.png  | Direction.Right = 4 |
| 1     | North-East  | rotations/north-east.png | Direction.UpRight = 6 |
| 2     | North-West  | rotations/north-west.png | Direction.UpLeft = 5 |
| 3     | North       | rotations/north.png | Direction.Up = 2 |
| 4     | South-East  | rotations/south-east.png | Direction.DownRight = 8 |
| 5     | South-West  | rotations/south-west.png | Direction.DownLeft = 7 |
| 6     | South       | rotations/south.png | Direction.Down = 1 |
| 7     | West        | rotations/west.png  | Direction.Left = 3 |

### Cross-Punch Animation (Frames 8-55)
6-frame punch animation for each direction (8 directions × 6 frames = 48 frames).

| Frames  | Direction    |
|---------|-------------|
| 8-13    | South       |
| 14-19   | South-East  |
| 20-25   | East        |
| 26-31   | North-East  |
| 32-37   | North       |
| 38-43   | North-West  |
| 44-49   | West        |
| 50-55   | South-West  |

### Falling-Back-Death (Frames 56-111)
7-frame death animation (8 directions × 7 frames = 56 frames).

### Picking-Up (Frames 112-151)
5-frame pickup animation (8 directions × 5 frames = 40 frames).

### Pushing (Frames 152-199)
6-frame push animation (8 directions × 6 frames = 48 frames).

### Running-6-Frames (Frames 200-247)
6-frame running animation (8 directions × 6 frames = 48 frames).

### Running-Slide (Frames 248-295)
6-frame slide animation (8 directions × 6 frames = 48 frames).

| Frames  | Direction    |
|---------|-------------|
| 248-253 | South       |
| 254-259 | South-East  |
| 260-265 | East        |
| 266-271 | North-East  |
| 272-277 | North       |
| 278-283 | North-West  |
| 284-289 | West        |
| 290-295 | South-West  |

### Surprise-Uppercut (Frames 296-351)
7-frame uppercut animation (8 directions × 7 frames = 56 frames).

### Swimming (Frames 352-399)
6-frame swimming animation (8 directions × 6 frames = 48 frames).
Generated from pushing animation with dark blue overlay on bottom 40% to simulate water submersion.

### Throw-Object (Frames 400-455)
7-frame throw animation (8 directions × 7 frames = 56 frames).

### Walking-5 (Frames 456-487)
4-frame walk animation (8 directions × 4 frames = 32 frames).

| Frames  | Direction    |
|---------|-------------|
| 456-459 | South       |
| 460-463 | South-East  |
| 464-467 | East        |
| 468-471 | North-East  |
| 472-475 | North       |
| 476-479 | North-West  |
| 480-483 | West        |
| 484-487 | South-West  |

## Regenerating the Sprite Sheet

Run the generation script:

```bash
node scripts/generate-attacker-spritesheet.js
```

This automatically discovers all animations in `public/assets/attacker/animations/` and generates the spritesheet.

See `agent-sops/updating-attacker-spritesheet.md` for complete SOP.

## Usage in Code

The player entity maps Direction enum values to frame indices:

```typescript
// Idle - alphabetical order
animMap.set(`idle_${Direction.Right}`, new Animation(['0'], 'static', 0));
animMap.set(`idle_${Direction.UpRight}`, new Animation(['1'], 'static', 0));
// ... etc

// Walk - frames 408-439
animMap.set(`walk_${Direction.Down}`, new Animation(['408', '409', '410', '411'], 'repeat', 0.125));
// ... etc

// Slide - frames 248-295
animMap.set(`slide_start_${Direction.Down}`, new Animation(['248', '249', '250', '251'], 'once', 0.0415));
// ... etc
```

**Critical:** The idle frame order (0-7) does NOT match the Direction enum order due to alphabetical sorting of source files. All other animations follow the standard South→South-East→East→... order.
