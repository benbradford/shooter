# Thrower Sprite Sheet Layout

**Frame Size:** 56x56 pixels  
**Sheet Dimensions:** 672×952 pixels (12×17 grid)  
**Total Frames:** 200

## Frame Index Mapping

```
Frames 0-7:     Idle rotations (8 directions)
Frames 8-63:    Throw-object (8 directions × 7 frames)
Frames 64-95:   Walking (8 directions × 4 frames)
Frames 96-143:  Taking-punch (8 directions × 6 frames)
Frames 144-199: Falling-back-death (8 directions × 7 frames)
```

## Direction Order

**CRITICAL:** Frames are in ALPHABETICAL order (not standard game direction order):

1. East
2. North
3. North-East
4. North-West
5. South
6. South-East
7. South-West
8. West

## Idle Rotations (Frames 0-7)

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

## Throw-Object Animation (Frames 8-63)

7 frames per direction × 8 directions = 56 frames

| Frames | Direction    |
|--------|-------------|
| 8-14   | East        |
| 15-21  | North       |
| 22-28  | North-East  |
| 29-35  | North-West  |
| 36-42  | South       |
| 43-49  | South-East  |
| 50-56  | South-West  |
| 57-63  | West        |

## Walking Animation (Frames 64-95)

4 frames per direction × 8 directions = 32 frames

| Frames | Direction    |
|--------|-------------|
| 64-67  | East        |
| 68-71  | North       |
| 72-75  | North-East  |
| 76-79  | North-West  |
| 80-83  | South       |
| 84-87  | South-East  |
| 88-91  | South-West  |
| 92-95  | West        |

## Taking-Punch Animation (Frames 96-143)

6 frames per direction × 8 directions = 48 frames

| Frames  | Direction    |
|---------|-------------|
| 96-101  | East        |
| 102-107 | North       |
| 108-113 | North-East  |
| 114-119 | North-West  |
| 120-125 | South       |
| 126-131 | South-East  |
| 132-137 | South-West  |
| 138-143 | West        |

## Falling-Back-Death Animation (Frames 144-199)

7 frames per direction × 8 directions = 56 frames

| Frames  | Direction    |
|---------|-------------|
| 144-150 | East        |
| 151-157 | North       |
| 158-164 | North-East  |
| 165-171 | North-West  |
| 172-178 | South       |
| 179-185 | South-East  |
| 186-192 | South-West  |
| 193-199 | West        |

## Regenerating the Sprite Sheet

```bash
node scripts/generate-thrower-spritesheet.mjs
```
