# Attacker Sprite Sheet Animation Reference

**Frame Size:** 56x56 pixels

## Directory Structure

```
public/assets/attacker/
├── rotations/              # 8 idle/standing frames (one per direction)
└── animations/             # All animation sequences
    ├── cross-punch/        # 48 frames (6 per direction, 8 directions)
    ├── running-6-frames/   # 6 frames (south only)
    ├── running-slide/      # 12 frames (6 per direction, 2 directions)
    ├── surprise-uppercut/  # 28 frames (7 per direction, 4 directions)
    ├── throw-object/       # 7 frames (east only)
    └── walking-5/          # 32 frames (4 per direction, 8 directions)
```

## Idle/Rotations (8 frames)

Located in `rotations/` directory.

| Frame | Direction    | File           |
|-------|-------------|----------------|
| 0     | South       | south.png      |
| 1     | South-East  | south-east.png |
| 2     | East        | east.png       |
| 3     | North-East  | north-east.png |
| 4     | North       | north.png      |
| 5     | North-West  | north-west.png |
| 6     | West        | west.png       |
| 7     | South-West  | south-west.png |

## Cross-Punch Animation (48 frames total)

6 frames per direction × 8 directions = 48 frames

**Directory:** `animations/cross-punch/{direction}/frame_000.png` to `frame_005.png`

| Frames | Direction    | Path                                    |
|--------|-------------|-----------------------------------------|
| 0-5    | South       | cross-punch/south/frame_000-005.png     |
| 6-11   | South-East  | cross-punch/south-east/frame_000-005.png|
| 12-17  | East        | cross-punch/east/frame_000-005.png      |
| 18-23  | North-East  | cross-punch/north-east/frame_000-005.png|
| 24-29  | North       | cross-punch/north/frame_000-005.png     |
| 30-35  | North-West  | cross-punch/north-west/frame_000-005.png|
| 36-41  | West        | cross-punch/west/frame_000-005.png      |
| 42-47  | South-West  | cross-punch/south-west/frame_000-005.png|

## Walking Animation (32 frames total)

4 frames per direction × 8 directions = 32 frames

**Directory:** `animations/walking-5/{direction}/frame_000.png` to `frame_003.png`

| Frames | Direction    | Path                                    |
|--------|-------------|-----------------------------------------|
| 0-3    | South       | walking-5/south/frame_000-003.png       |
| 4-7    | South-East  | walking-5/south-east/frame_000-003.png  |
| 8-11   | East        | walking-5/east/frame_000-003.png        |
| 12-15  | North-East  | walking-5/north-east/frame_000-003.png  |
| 16-19  | North       | walking-5/north/frame_000-003.png       |
| 20-23  | North-West  | walking-5/north-west/frame_000-003.png  |
| 24-27  | West        | walking-5/west/frame_000-003.png        |
| 28-31  | South-West  | walking-5/south-west/frame_000-003.png  |

## Surprise Uppercut Animation (28 frames total)

7 frames per direction × 4 directions = 28 frames

**Directory:** `animations/surprise-uppercut/{direction}/frame_000.png` to `frame_006.png`

| Frames | Direction | Path                                         |
|--------|-----------|----------------------------------------------|
| 0-6    | South     | surprise-uppercut/south/frame_000-006.png    |
| 7-13   | East      | surprise-uppercut/east/frame_000-006.png     |
| 14-20  | North     | surprise-uppercut/north/frame_000-006.png    |
| 21-27  | West      | surprise-uppercut/west/frame_000-006.png     |

## Running Slide Animation (12 frames total)

6 frames per direction × 2 directions = 12 frames

**Directory:** `animations/running-slide/{direction}/frame_000.png` to `frame_005.png`

| Frames | Direction | Path                                      |
|--------|-----------|-------------------------------------------|
| 0-5    | South     | running-slide/south/frame_000-005.png     |
| 6-11   | East      | running-slide/east/frame_000-005.png      |

## Running (6 Frames) Animation (6 frames total)

6 frames × 1 direction = 6 frames

**Directory:** `animations/running-6-frames/south/frame_000.png` to `frame_005.png`

| Frames | Direction | Path                                           |
|--------|-----------|------------------------------------------------|
| 0-5    | South     | running-6-frames/south/frame_000-005.png       |

## Throw Object Animation (7 frames total)

7 frames × 1 direction = 7 frames

**Directory:** `animations/throw-object/east/frame_000.png` to `frame_006.png`

| Frames | Direction | Path                                      |
|--------|-----------|-------------------------------------------|
| 0-6    | East      | throw-object/east/frame_000-006.png       |

## Sprite Sheet Layout Recommendation

**Total frames needed:** 8 (idle) + 48 (cross-punch) + 32 (walking) + 28 (uppercut) + 12 (running-slide) + 6 (running-6) + 7 (throw) = **141 frames**

**Recommended layout:** 12 columns × 12 rows = 144 frames (141 used, 3 empty)

**Frame dimensions:** 56×56 pixels
**Sheet dimensions:** 672×672 pixels (12×56 = 672)

### Frame Index Mapping

```
Frames 0-7:     Idle rotations (S, SE, E, NE, N, NW, W, SW)
Frames 8-55:    Cross-punch (8 directions × 6 frames)
Frames 56-87:   Walking (8 directions × 4 frames)
Frames 88-115:  Surprise uppercut (4 directions × 7 frames)
Frames 116-127: Running slide (2 directions × 6 frames)
Frames 128-133: Running 6-frames (1 direction × 6 frames)
Frames 134-140: Throw object (1 direction × 7 frames)
Frames 141-143: Empty/unused
```

## Creating the Sprite Sheet

Use ImageMagick to combine all frames:

```bash
cd public/assets/attacker

# Create ordered list of files
{
  # Idle (0-7)
  ls rotations/south.png rotations/south-east.png rotations/east.png \
     rotations/north-east.png rotations/north.png rotations/north-west.png \
     rotations/west.png rotations/south-west.png
  
  # Cross-punch (8-55)
  for dir in south south-east east north-east north north-west west south-west; do
    ls animations/cross-punch/$dir/frame_*.png | sort
  done
  
  # Walking (56-87)
  for dir in south south-east east north-east north north-west west south-west; do
    ls animations/walking-5/$dir/frame_*.png | sort
  done
  
  # Uppercut (88-115)
  for dir in south east north west; do
    ls animations/surprise-uppercut/$dir/frame_*.png | sort
  done
  
  # Running slide (116-127)
  for dir in south east; do
    ls animations/running-slide/$dir/frame_*.png | sort
  done
  
  # Running 6-frames (128-133)
  ls animations/running-6-frames/south/frame_*.png | sort
  
  # Throw object (134-140)
  ls animations/throw-object/east/frame_*.png | sort
  
} > frame_list.txt

# Create sprite sheet
montage @frame_list.txt -tile 12x12 -geometry 56x56+0+0 -background none attacker-spritesheet-new.png
```
