# Puma Spritesheet

**File:** `puma_spritesheet.png`  
**Frame Size:** 48x48 pixels  
**Sheet Dimensions:** 384x1488 pixels (8 columns × 31 rows)  
**Total Frames:** 248 frames

## Frame Layout

### Idle Rotations (Frames 0-7)
Single frame per direction, alphabetical order.

| Frame | Direction    |
|-------|-------------|
| 0     | East        |
| 1     | North-East  |
| 2     | North-West  |
| 3     | North       |
| 4     | South-East  |
| 5     | South-West  |
| 6     | South       |
| 7     | West        |

### Jump Animation (Frames 8-71)
8 frames per direction × 8 directions = 64 frames

| Frames  | Direction    |
|---------|-------------|
| 8-15    | South       |
| 16-23   | South-East  |
| 24-31   | East        |
| 32-39   | North-East  |
| 40-47   | North       |
| 48-55   | North-West  |
| 56-63   | West        |
| 64-71   | South-West  |

### Running-4-Frames (Frames 72-103)
4 frames per direction × 8 directions = 32 frames

| Frames  | Direction    |
|---------|-------------|
| 72-75   | South       |
| 76-79   | South-East  |
| 80-83   | East        |
| 84-87   | North-East  |
| 88-91   | North       |
| 92-95   | North-West  |
| 96-99   | West        |
| 100-103 | South-West  |

### Seated-On-Belly-Idle (Frames 104-183)
10 frames per direction × 8 directions = 80 frames

| Frames   | Direction    |
|----------|-------------|
| 104-113  | South       |
| 114-123  | South-East  |
| 124-133  | East        |
| 134-143  | North-East  |
| 144-153  | North       |
| 154-163  | North-West  |
| 164-173  | West        |
| 174-183  | South-West  |

### Standing-From-Belly (Frames 184-247)
8 frames per direction × 8 directions = 64 frames

| Frames   | Direction    |
|----------|-------------|
| 184-191  | South       |
| 192-199  | South-East  |
| 200-207  | East        |
| 208-215  | North-East  |
| 216-223  | North       |
| 224-231  | North-West  |
| 232-239  | West        |
| 240-247  | South-West  |

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
