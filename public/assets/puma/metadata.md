# Puma Spritesheet

**File:** `puma_spritesheet.png`  
**Frame Size:** 48x48 pixels  
**Sheet Dimensions:** 576x1248 pixels (12 columns × 26 rows)  
**Total Frames:** 304 frames

## Frame Layout

### Idle Rotations (Frames 0-7)
Single frame per direction, alphabetical order.

| Frame | Direction    |
|-------|-------------|
| 0     | East        |
| 1     | North       |
| 2     | North-East  |
| 3     | North-West  |
| 4     | South       |
| 5     | South-East  |
| 6     | South-West  |
| 7     | West        |

### Angry Animation (Frames 8-63)
7 frames per direction × 8 directions = 56 frames

| Frames  | Direction    |
|---------|-------------|
| 8-14    | East        |
| 15-21   | North       |
| 22-28   | North-East  |
| 29-35   | North-West  |
| 36-42   | South       |
| 43-49   | South-East  |
| 50-56   | South-West  |
| 57-63   | West        |

### Jump Animation (Frames 64-127)
8 frames per direction × 8 directions = 64 frames

| Frames   | Direction    |
|----------|-------------|
| 64-71    | East        |
| 72-79    | North       |
| 80-87    | North-East  |
| 88-95    | North-West  |
| 96-103   | South       |
| 104-111  | South-East  |
| 112-119  | South-West  |
| 120-127  | West        |

### Running-4-Frames (Frames 128-159)
4 frames per direction × 8 directions = 32 frames

| Frames   | Direction    |
|----------|-------------|
| 128-131  | East        |
| 132-135  | North       |
| 136-139  | North-East  |
| 140-143  | North-West  |
| 144-147  | South       |
| 148-151  | South-East  |
| 152-155  | South-West  |
| 156-159  | West        |

### Seated-On-Belly-Idle (Frames 160-239)
10 frames per direction × 8 directions = 80 frames

| Frames   | Direction    |
|----------|-------------|
| 160-169  | East        |
| 170-179  | North       |
| 180-189  | North-East  |
| 190-199  | North-West  |
| 200-209  | South       |
| 210-219  | South-East  |
| 220-229  | South-West  |
| 230-239  | West        |

### Standing-From-Belly (Frames 240-303)
8 frames per direction × 8 directions = 64 frames

| Frames   | Direction    |
|----------|-------------|
| 240-247  | East        |
| 248-255  | North       |
| 256-263  | North-East  |
| 264-271  | North-West  |
| 272-279  | South       |
| 280-287  | South-East  |
| 288-295  | South-West  |
| 296-303  | West        |

## Usage

```typescript
// In AssetRegistry.ts
puma: {
  key: 'puma',
  path: 'assets/puma/puma_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 48, frameHeight: 48 }
}
```
