# Skeleton Sprite Sheet

**File**: `skeleton-spritesheet.png`  
**Dimensions**: 288×1344 pixels (6 columns × 28 rows)  
**Frame Size**: 48×48 pixels

## Layout

The sprite sheet contains 4 animations with varying direction counts:

### Row Groups

| Rows   | Animation      | Frames | Directions |
|--------|----------------|--------|------------|
| 0-7    | Idle           | 1      | 8          |
| 8-15   | Walk           | 4      | 8          |
| 16-23  | Lead Jab       | 3      | 8          |
| 24-27  | Taking Punch   | 6      | 4          |

### Direction Order

**8-direction animations** (Idle, Walk, Jab):
1. South
2. South-East
3. East
4. North-East
5. North
6. North-West
7. West
8. South-West

**4-direction animation** (Taking Punch):
1. South
2. East
3. North
4. West

## Frame Indices

To calculate frame index for a specific animation/direction:

```typescript
const baseRow = animationOffset + directionIndex;
const frameIndex = baseRow * 6 + frameNumber;

// Animation offsets:
// Idle: 0, Walk: 8, Jab: 16, Punch: 24

// Direction indices (8-dir): South:0, SE:1, East:2, NE:3, North:4, NW:5, West:6, SW:7
// Direction indices (4-dir): South:0, East:1, North:2, West:3
```

## Example Usage

```typescript
// Walk animation, facing east, frame 2
const row = 8 + 2;  // Walk offset (8) + East direction (2)
const frame = row * 6 + 2;  // Row 10, frame 2 = index 62

// Punch animation, facing north, frame 3
const row = 24 + 2;  // Punch offset (24) + North direction (2)
const frame = row * 6 + 3;  // Row 26, frame 3 = index 159
```

## Asset Registration

```typescript
skeleton: {
  key: 'skeleton',
  path: 'assets/skeleton/skeleton-spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 48, frameHeight: 48 }
}
```
