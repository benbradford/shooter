# SOP: Updating Attacker Spritesheet with New Animations

## When to Use
When adding new animation directories to `public/assets/attacker/animations/` or modifying existing animations.

## Prerequisites
- ImageMagick installed (`montage` command available)
- New animation frames in correct directory structure

## Directory Structure
```
public/assets/attacker/
├── rotations/              # 8 idle frames (one per direction)
│   ├── south.png
│   ├── south-east.png
│   ├── east.png
│   └── ... (8 total)
└── animations/             # All animation sequences
    ├── cross-punch/        # 8 direction subdirs, 6 frames each
    ├── walking-5/          # 8 direction subdirs, 4 frames each
    ├── running-slide/      # 8 direction subdirs, 6 frames each
    └── your-new-anim/      # Your new animation
```

## Step 1: Add New Animation Frames

Place animation frames in correct structure:

**Multi-direction animation:**
```
animations/your-anim/
├── south/
│   ├── frame_000.png
│   ├── frame_001.png
│   └── ...
├── south-east/
│   └── ...
└── ... (8 directions)
```

**Single-direction animation:**
```
animations/your-anim/
├── frame_000.png
├── frame_001.png
└── ...
```

## Step 2: Generate Spritesheet

Run the generation script:

```bash
node scripts/generate-attacker-spritesheet.js
```

**Output:**
- `public/assets/attacker/attacker-spritesheet.png` - New spritesheet
- `public/assets/attacker/frame_list.txt` - Frame order reference
- Console output showing frame index ranges

**Example output:**
```
Frame Index Mapping:
Frames 0-7: Idle rotations
Frames 8-55: cross-punch
Frames 56-111: falling-back-death
Frames 408-439: walking-5
```

## Step 3: Update Animation Indices in Code

### Find Affected Animations

Search for animation definitions using old indices:

```bash
grep -r "Animation\(\[" src/ecs/entities/player/
```

### Update Frame Indices

For each animation, update the frame numbers based on the console output from Step 2.

**Important:** Idle rotations (frames 0-7) are in **alphabetical order**, not Direction enum order:
- Frame 0: east → Direction.Right
- Frame 1: north-east → Direction.UpRight
- Frame 2: north-west → Direction.UpLeft
- Frame 3: north → Direction.Up
- Frame 4: south-east → Direction.DownRight
- Frame 5: south-west → Direction.DownLeft
- Frame 6: south → Direction.Down
- Frame 7: west → Direction.Left

**Example:**

Old (walk was at 56-87):
```typescript
animMap.set(`walk_${Direction.Down}`, new Animation(['56', '57', '58', '59'], 'repeat', 0.125));
```

New (walk now at 408-439):
```typescript
animMap.set(`walk_${Direction.Down}`, new Animation(['408', '409', '410', '411'], 'repeat', 0.125));
```

### Common Animations to Update

- **Idle:** Frames 0-7 (alphabetical order - rarely needs updating)
- **Punch (cross-punch):** Frames 8-55 (6 frames × 8 directions)
- **Walk (walking-5):** Check console output for new range
- **Slide (running-slide):** Check console output for new range

## Step 4: Verify

```bash
npm run build
npm run dev
```

Test each animation in-game:
- Idle (stand still)
- Walk (WASD)
- Punch (Space)
- Slide (H)

## Step 5: Update Documentation

If adding new animations that are used in gameplay, update:
- `docs/attacker-spritesheet.md` - Frame layout reference
- `docs/quick-reference.md` - If new controls added

## Troubleshooting

**Wrong frames showing:**
- Check console output from Step 2 for correct frame ranges
- Verify direction order matches: south, south-east, east, north-east, north, north-west, west, south-west

**Spritesheet too large:**
- Script uses 12 columns by default
- Large spritesheets may hit browser limits (~4096x4096)
- Consider splitting into multiple spritesheets if needed

**Animation not found:**
- Ensure directory name is alphabetically sorted correctly
- Script processes animations in alphabetical order
- Earlier animations in alphabet = lower frame indices

## Notes

- Rotations always at frames 0-7 (never changes)
- Animations sorted alphabetically by directory name
- Each animation processes directions in fixed order (south → south-east → ... → south-west)
- Frame indices shift when animations are added/removed
- Always regenerate spritesheet after any animation changes
