# TV Monk Spritesheet Layout

**File:** `public/assets/tv_monk/tv_monk_spritesheet.png`
**Frame Size:** 80x80 pixels
**Sheet Dimensions:** 800x400 (10 columns × 5 rows)
**Total Frames:** 33

## Frame Layout

| Row | Frames | Animation | Count | Direction |
|-----|--------|-----------|-------|-----------|
| 0 | 0-7 | Idle rotations | 8 | All 8 dirs (alphabetical) |
| 1 | 10-13 | Raise hands | 4 | South |
| 2 | 20-24 | Raise hands | 5 | North |
| 3 | 30-35 | Taking Punch | 6 | South |
| 4 | 40-49 | Falling down | 10 | South |

## Idle Rotations (Row 0, Frames 0-7)

Alphabetical order:

| Frame | Direction |
|-------|-----------|
| 0 | East |
| 1 | North-East |
| 2 | North-West |
| 3 | North |
| 4 | South-East |
| 5 | South-West |
| 6 | South |
| 7 | West |

## Regenerating

**CRITICAL:** Use `null:` placeholders to pad each row to 10 columns. Without them, montage packs frames sequentially and animations end up on wrong rows.

```bash
cd public/assets/tv_monk
montage \
  rotations/{east,north-east,north-west,north,south-east,south-west,south,west}.png null: null: \
  animations/Raise_both_hands_together_up_in_the_air-764d25b8/south/frame_00{0,1,2,3}.png null: null: null: null: null: null: \
  animations/Raise_both_hands_together_up_in_the_air-764d25b8/north/frame_00{0,1,2,3,4}.png null: null: null: null: null: \
  animations/Taking_Punch-775bdfc1/south/frame_00{0,1,2,3,4,5}.png null: null: null: null: \
  animations/Falling_down_forwards_onto_face._throw_arms_forwar-c8a0b319/south/frame_00{0,1,2,3,4,5,6,7,8,9}.png \
  -tile 10x5 -geometry 80x80+0+0 -background none tv_monk_spritesheet.png
```
