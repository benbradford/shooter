# TV Monk Spritesheet Layout

**File:** `public/assets/tv_monk/tv_monk_spritesheet.png`
**Frame Size:** 80x80 pixels
**Sheet Dimensions:** 640x480 (8 columns × 6 rows)
**Total Frames:** 48

## Frame Layout

| Row | Frames | Animation | Count | Direction |
|-----|--------|-----------|-------|-----------|
| 0 | 0-7 | Idle rotations | 8 | All 8 dirs (alphabetical) |
| 1 | 8-11 | Raise hands | 4 | South |
| 2 | 16-20 | Raise hands | 5 | North |
| 3 | 24-29 | Taking Punch | 6 | South |
| 4-5 | 32-41 | Falling down (death) | 10 | South |

## Idle Rotations (Row 0, Frames 0-7)

Alphabetical order:

| Frame | Direction |
|-------|-----------|
| 0 | East |
| 1 | North |
| 2 | North-East |
| 3 | North-West |
| 4 | South |
| 5 | South-East |
| 6 | South-West |
| 7 | West |

## Animation Keys

Created by `TvMonkAnimations.ts`:
- `tv_monk_idle_{dir}` — 8 directions
- `tv_monk_raise_hands_south` — 4 frames
- `tv_monk_raise_hands_north` — 5 frames
- `tv_monk_hit_south` — 6 frames
- `tv_monk_death_south` — 10 frames

## Regenerating

```bash
cd public/assets/tv_monk
montage \
  rotations/east.png rotations/north.png rotations/north-east.png rotations/north-west.png \
  rotations/south.png rotations/south-east.png rotations/south-west.png rotations/west.png \
  animations/Raise_both_hands_together_up_in_the_air-764d25b8/south/frame_00{0,1,2,3}.png null: null: null: null: \
  animations/Raise_both_hands_together_up_in_the_air-764d25b8/north/frame_00{0,1,2,3,4}.png null: null: null: \
  animations/Taking_Punch-775bdfc1/south/frame_00{0,1,2,3,4,5}.png null: null: \
  animations/Falling_down_forwards_onto_face._throw_arms_forwar-c8a0b319/south/frame_00{0,1,2,3,4,5,6,7,8,9}.png \
  -tile 8x -geometry 80x80+0+0 -background none tv_monk_spritesheet.png
```
