# Knight Spritesheet Reference

**File:** `public/assets/knight/knight_spritesheet.png`
**Frame Size:** 68x68 pixels
**Sheet Dimensions:** 544x476 (8 columns × 7 rows)
**Directions:** 4 — east, north, south, west (alphabetical order)

## Frame Layout

| Row | Frames | Animation | Directions | Frames/Dir |
|-----|--------|-----------|------------|------------|
| 0 | 0-3 | Idle rotations | east, north, south, west | 1 |
| 1 | 8-15 | Scary_Walk | east | 8 |
| 2 | 16-23 | Scary_Walk | north | 8 |
| 3 | 24-31 | Scary_Walk | south | 8 |
| 4 | 32-39 | Scary_Walk | west | 8 |
| 5 | 40-44 | Arms_stretched | south only | 5 |
| 6 | 48-52 | Crouching | south only | 5 |

Blank padding: frames 4-7 (row 0), 45-47 (row 5), 53-55 (row 6).

## Direction Index Mapping

| Index | Direction |
|-------|-----------|
| 0 | East |
| 1 | North |
| 2 | South |
| 3 | West |

## Source Files

- **Idle rotations:** `rotations/{east,north,south,west}.png`
- **Scary_Walk:** `animations/Scary_Walk-634ffcec/{east,north,south,west}/frame_000.png` – `frame_007.png`
- **Arms_stretched:** `animations/Arms_stretched_out_wide_to_the_side-e3948fe0/south/frame_000.png` – `frame_004.png`
- **Crouching:** `animations/crouching_to_the_floor_in_fear_with_hands_on_head-8bdb10e0/south/frame_000.png` – `frame_004.png`

## Regenerating

```bash
cd public/assets/knight
DIRS="east north south west"
FRAME=68
COLS=8
WALK="animations/Scary_Walk-634ffcec"
ARMS="animations/Arms_stretched_out_wide_to_the_side-e3948fe0"
CROUCH="animations/crouching_to_the_floor_in_fear_with_hands_on_head-8bdb10e0"
TMPDIR=$(mktemp -d)

magick -size ${FRAME}x${FRAME} xc:none "$TMPDIR/blank.png"

# Row 0: Idle
montage rotations/{east,north,south,west}.png "$TMPDIR/blank.png" "$TMPDIR/blank.png" "$TMPDIR/blank.png" "$TMPDIR/blank.png" \
  -tile ${COLS}x1 -geometry ${FRAME}x${FRAME}+0+0 -background none "$TMPDIR/row0.png"

# Rows 1-4: Scary_Walk per direction
R=1; for d in $DIRS; do
  montage "$WALK/$d"/frame_*.png -tile ${COLS}x1 -geometry ${FRAME}x${FRAME}+0+0 -background none "$TMPDIR/row${R}.png"
  R=$((R+1))
done

# Row 5: Arms_stretched south
montage "$ARMS/south"/frame_*.png "$TMPDIR/blank.png" "$TMPDIR/blank.png" "$TMPDIR/blank.png" \
  -tile ${COLS}x1 -geometry ${FRAME}x${FRAME}+0+0 -background none "$TMPDIR/row5.png"

# Row 6: Crouching south
montage "$CROUCH/south"/frame_*.png "$TMPDIR/blank.png" "$TMPDIR/blank.png" "$TMPDIR/blank.png" \
  -tile ${COLS}x1 -geometry ${FRAME}x${FRAME}+0+0 -background none "$TMPDIR/row6.png"

# Stack
magick "$TMPDIR"/row{0,1,2,3,4,5,6}.png -append knight_spritesheet.png
rm -rf "$TMPDIR"
```
