# Attacker Spritesheet Layout

**File:** `public/assets/attacker/attacker-spritesheet.png`  
**Frame Size:** 56x56 pixels  
**Sheet Dimensions:** 672×672 pixels (12×12 grid)
**Total Frames:** 141 frames (3 empty slots at end)

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

### Walking Animation (Frames 56-87)
4-frame walk animation for each direction (8 directions × 4 frames = 32 frames).

| Frames  | Direction    |
|---------|-------------|
| 56-59   | South       |
| 60-63   | South-East  |
| 64-67   | East        |
| 68-71   | North-East  |
| 72-75   | North       |
| 76-79   | North-West  |
| 80-83   | West        |
| 84-87   | South-West  |

### Surprise Uppercut (Frames 88-115)
7-frame uppercut animation (4 directions × 7 frames = 28 frames).

| Frames  | Direction |
|---------|-----------|
| 88-94   | South     |
| 95-101  | East      |
| 102-108 | North     |
| 109-115 | West      |

### Running Slide (Frames 116-127)
6-frame slide animation (2 directions × 6 frames = 12 frames).

| Frames  | Direction |
|---------|-----------|
| 116-121 | South     |
| 122-127 | East      |

### Running (Frames 128-133)
6-frame running animation (South only).

### Throw Object (Frames 134-140)
7-frame throw animation (East only).

## Regenerating the Sprite Sheet

See `docs/attacker-spritesheet-reference.md` for complete instructions on regenerating the spritesheet from source images.

## Usage in Code

The player entity maps Direction enum values to frame indices:

```typescript
// Idle - must explicitly map enum values to frame indices
animMap.set(`idle_${Direction.Right}`, new Animation(['0'], 'static', 0));
animMap.set(`idle_${Direction.UpRight}`, new Animation(['1'], 'static', 0));
animMap.set(`idle_${Direction.UpLeft}`, new Animation(['2'], 'static', 0));
animMap.set(`idle_${Direction.Up}`, new Animation(['3'], 'static', 0));
animMap.set(`idle_${Direction.DownRight}`, new Animation(['4'], 'static', 0));
animMap.set(`idle_${Direction.DownLeft}`, new Animation(['5'], 'static', 0));
animMap.set(`idle_${Direction.Down}`, new Animation(['6'], 'static', 0));
animMap.set(`idle_${Direction.Left}`, new Animation(['7'], 'static', 0));

// Walk - direction order matches spritesheet
animMap.set(`walk_${Direction.Down}`, new Animation(['56', '57', '58', '59'], 'repeat', 0.125));
// ... etc
```

**Critical:** The idle frame order (0-7) does NOT match the Direction enum order due to alphabetical sorting of source files. Walk and punch animations follow the standard South→South-East→East→... order.
