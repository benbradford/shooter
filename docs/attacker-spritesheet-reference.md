# Attacker Sprite Sheet Animation Reference

**File:** `public/assets/attacker/attacker-spritesheet.png`
**Frame Size:** 56x56 pixels
**Sheet Dimensions:** 12 columns × 62 rows = 744 slots (735 used)
**Total Frames:** 735

## Frame Layout

All multi-direction animations use 8 directions in order: South, South-East, East, North-East, North, North-West, West, South-West.

| Frames | Animation | Frames/Dir | Key prefix |
|--------|-----------|-----------|------------|
| 0-7 | Idle rotations | 1 | `idle` |
| 8-55 | Cross punch | 6 | `punch` |
| 56-111 | Falling back death | 7 | `death` |
| 112-183 | Jumping | 9 | `jump` |
| 184-190 | Landing (south only) | 7 | `fall` |
| 191-230 | Picking up | 5 | `pickup` |
| 231-302 | Power up (raising arms) | 9 | `powerup` |
| 303-350 | Pushing | 6 | `push` |
| 351-398 | Running | 6 | `run` |
| 399-446 | Sliding | 6 | `slide` |
| 447-502 | Surprise uppercut | 7 | `uppercut` |
| 503-534 | Walking | 4 | `walk` |
| 535-590 | Throw object | 7 | `throw` |
| 591-642 | Breaststroke (raw) | 6-7 | — |
| 643-694 | Swimming (blue tint) | 6-7 | `swim` |

**⚠️ Breaststroke/Swimming have uneven frame counts:** south, south-east, north, south-west have 7 frames; east, north-east, north-west, west have 6. Always verify actual ranges from `frame_list.txt` when updating indices.
| 695-734 | Walking punch | 5 | `walking_punch` |

## Idle Rotations (Frames 0-7)

**Critical:** Frame order is alphabetical by filename, NOT Direction enum order.

| Frame | Direction | Direction Enum |
|-------|-----------|----------------|
| 0 | East | Direction.Right = 4 |
| 1 | North-East | Direction.UpRight = 6 |
| 2 | North-West | Direction.UpLeft = 5 |
| 3 | North | Direction.Up = 2 |
| 4 | South-East | Direction.DownRight = 8 |
| 5 | South-West | Direction.DownLeft = 7 |
| 6 | South | Direction.Down = 1 |
| 7 | West | Direction.Left = 3 |

## Animation Key Format

In code: `{name}_{Direction enum value}` — e.g., `punch_1` = punch facing south (Down=1).

In Lua: `player.playAnim("punch", "once", "down")` — direction resolved automatically.

## Regenerating the Sprite Sheet

```bash
node scripts/generate-attacker-spritesheet.js
```

This discovers all animations in `public/assets/attacker/animations/`, generates swimming frames from breaststroke, and creates the spritesheet.

See `agent-sops/updating-attacker-spritesheet.md` for complete SOP.
