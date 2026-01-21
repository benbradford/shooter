# Floating Robot Sprite Sheet

## Overview

The floating robot sprite sheet combines all animations and rotations into a single 768×528 pixel image.

**File**: `public/assets/floating_robot/floating-robot-spritesheet.png`

## Specifications

- **Grid**: 16 columns × 11 rows
- **Frame size**: 48×48 pixels
- **Total frames**: 176
- **Format**: PNG with transparency

## Frame Layout

### Row 0: Idle (frames 0-7)
Single frame per direction, 8 total frames.

### Rows 1-4: Walk Animation (frames 8-71)
8 frames per direction, 64 total frames.
- Row 1: south walk (frames 8-15)
- Row 2: north walk (frames 16-23)
- Row 3: west walk (frames 24-31)
- Row 4: east walk (frames 32-39)
- Row 5: north-west walk (frames 40-47)
- Row 6: north-east walk (frames 48-55)
- Row 7: south-west walk (frames 56-63)
- Row 8: south-east walk (frames 64-71)

### Rows 5-8: Death Animation (frames 72-127)
7 frames per direction, 56 total frames.
- Frames 72-78: south death
- Frames 79-85: north death
- Frames 86-92: west death
- Frames 93-99: east death
- Frames 100-106: north-west death
- Frames 107-113: north-east death
- Frames 114-120: south-west death
- Frames 121-127: south-east death

### Rows 9-10: Fireball Animation (frames 128-175)
6 frames per direction, 48 total frames.
- Frames 128-133: south fireball
- Frames 134-139: north fireball
- Frames 140-145: west fireball
- Frames 146-151: east fireball
- Frames 152-157: north-west fireball
- Frames 158-163: north-east fireball
- Frames 164-169: south-west fireball
- Frames 170-175: south-east fireball

## Direction Order

All animations follow this direction order (matches game's Direction enum):
1. **south** (down)
2. **north** (up)
3. **west** (left)
4. **east** (right)
5. **north-west** (up-left)
6. **north-east** (up-right)
7. **south-west** (down-left)
8. **south-east** (down-right)

## Usage in Phaser

```typescript
// Load sprite sheet
this.load.spritesheet('floating_robot', 'assets/floating_robot/floating-robot-spritesheet.png', {
  frameWidth: 48,
  frameHeight: 48
});

// Frame calculation examples:
// Idle south: frame 0
// Idle north: frame 1
// Walk south frame 0: frame 8
// Walk south frame 7: frame 15
// Death south frame 0: frame 72
// Fireball south frame 0: frame 128
```

## Regenerating the Sprite Sheet

If you need to regenerate the sprite sheet from source images:

```bash
python3 scripts/generate-robot-spritesheet.py
```

The script reads from:
- `public/assets/floating_robot/rotations/` - Idle frames
- `public/assets/floating_robot/animations/scary-walk/` - Walk animation
- `public/assets/floating_robot/animations/falling-back-death/` - Death animation
- `public/assets/floating_robot/animations/fireball/` - Fireball animation

## Frame Index Formula

To calculate frame index for a specific animation:

```typescript
// Idle
const idleFrame = directionIndex;  // 0-7

// Walk (8 frames per direction)
const walkFrame = 8 + (directionIndex * 8) + frameNumber;  // frameNumber: 0-7

// Death (7 frames per direction)
const deathFrame = 72 + (directionIndex * 7) + frameNumber;  // frameNumber: 0-6

// Fireball (6 frames per direction)
const fireballFrame = 128 + (directionIndex * 6) + frameNumber;  // frameNumber: 0-5
```

Where `directionIndex` follows the direction order above (0=south, 1=north, etc.).
