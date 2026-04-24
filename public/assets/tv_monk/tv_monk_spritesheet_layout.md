# TV Monk Spritesheet Layout

**File:** `public/assets/tv_monk/tv_monk_spritesheet.png`
**Frame Size:** 80x80 pixels
**Sheet Dimensions:** 640x480 (8 columns × 6 rows)
**Total Frames:** 37

## Frame Layout

| Row | Frames | Animation | Frames/Count | Direction |
|-----|--------|-----------|-------------|-----------|
| 0 | 0-7 | Idle rotations | 8 | All 8 dirs (alphabetical) |
| 1 | 8-13 | Drinking | 6 | South only |
| 2 | 16-21 | Fireball | 6 | South only |
| 3 | 24-27 | Raise hands | 4 | South only |
| 4 | 32-37 | Taking Punch | 6 | South only |
| 5 | 40-46 | Throw Object | 7 | South only |

## Idle Rotations (Row 0, Frames 0-7)

Alphabetical order (same as all enemy spritesheets):

| Frame | Direction | Direction Enum |
|-------|-----------|----------------|
| 0 | East | Direction.Right |
| 1 | North-East | Direction.UpRight |
| 2 | North-West | Direction.UpLeft |
| 3 | North | Direction.Up |
| 4 | South-East | Direction.DownRight |
| 5 | South-West | Direction.DownLeft |
| 6 | South | Direction.Down |
| 7 | West | Direction.Left |

## Animation Frames

Animations are south-facing only (single direction).

- **Drinking** (row 1): frames 8-13 (6 frames)
- **Fireball** (row 2): frames 16-21 (6 frames)
- **Raise Hands** (row 3): frames 24-27 (4 frames)
- **Taking Punch** (row 4): frames 32-37 (6 frames)
- **Throw Object** (row 5): frames 40-46 (7 frames)

Note: Rows with fewer than 8 frames have empty (transparent) cells at the end.

## Regenerating

```bash
cd public/assets/tv_monk
montage \
  rotations/east.png rotations/north-east.png rotations/north-west.png rotations/north.png rotations/south-east.png rotations/south-west.png rotations/south.png rotations/west.png \
  animations/Drinking-396058d7/south/frame_00{0,1,2,3,4,5}.png \
  animations/Fireball-79eac35c/south/frame_00{0,1,2,3,4,5}.png \
  animations/Raise_both_hands_together_up_in_the_air-764d25b8/south/frame_00{0,1,2,3}.png \
  animations/Taking_Punch-775bdfc1/south/frame_00{0,1,2,3,4,5}.png \
  animations/Throw_Object-19bab6ad/south/frame_00{0,1,2,3,4,5,6}.png \
  -tile 8x6 -geometry 80x80+0+0 -background none tv_monk_spritesheet.png
```
