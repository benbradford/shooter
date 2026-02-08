# Attacker Spritesheet Layout

**File:** `public/assets/attacker/attacker-spritesheet.png`  
**Frame Size:** 56x56 pixels  
**Total Frames:** 53 frames (0-52)

## Frame Layout

### Idle Rotations (Frames 0-7)
Single frame per direction, no animation.

| Frame | Direction    |
|-------|-------------|
| 0     | South       |
| 1     | South-East  |
| 2     | East        |
| 3     | North-East  |
| 4     | North       |
| 5     | North-West  |
| 6     | West        |
| 7     | South-West  |

### Cross-Punch Animation (Frames 8-52)
6-frame punch animation for each direction (except south-west which has 7 frames).

| Frames  | Direction    | Frame Count |
|---------|-------------|-------------|
| 8-13    | West        | 6 frames    |
| 14-19   | South-West  | 6 frames    |
| 20-26   | South-West  | 7 frames    |
| 27-32   | South       | 6 frames    |
| 33-38   | South-East  | 6 frames    |
| 39-44   | East        | 6 frames    |
| 45-50   | North-East  | 6 frames    |
| 51-52   | North       | 2 frames    |

**Note:** The cross-punch animation is incomplete - only 2 frames exist for North direction.

## Available Animations (from metadata.json)

### Throw Object
- **East only:** 7 frames
- Located in `animations/throw-object/east/`

### Running Slide
- **South:** 6 frames
- **East:** 6 frames
- Located in `animations/running-slide/{direction}/`

### Surprise Uppercut
- **South:** 7 frames
- **East:** 7 frames
- Located in `animations/surprise-uppercut/{direction}/`

### Walking
- **South only:** 4 frames
- Located in `animations/walking-5/south/`

### Running (6 frames)
- **South only:** 6 frames
- Located in `animations/running-6-frames/south/`

## Creating Animations

### Example: Idle Animation
```typescript
// Single frame, no animation
animationSystem.add('idle_down', new Animation({
  frames: [0],
  frameRate: 1,
  style: 'static'
}));

animationSystem.add('idle_right', new Animation({
  frames: [2],
  frameRate: 1,
  style: 'static'
}));
```

### Example: Cross-Punch Animation
```typescript
// West punch (6 frames)
animationSystem.add('punch_left', new Animation({
  frames: [8, 9, 10, 11, 12, 13],
  frameRate: 24,
  style: 'static'
}));

// East punch (6 frames)
animationSystem.add('punch_right', new Animation({
  frames: [39, 40, 41, 42, 43, 44],
  frameRate: 24,
  style: 'static'
}));

// South punch (6 frames)
animationSystem.add('punch_down', new Animation({
  frames: [27, 28, 29, 30, 31, 32],
  frameRate: 24,
  style: 'static'
}));
```

## Missing Animations

The following animations are incomplete or missing:
- **Cross-punch North:** Only 2 frames (51-52), needs 4 more frames
- **Cross-punch North-West:** Not present in spritesheet
- **Walk animations:** Only South direction available
- **Running animations:** Only South direction available
- **Throw/Uppercut:** Only South and East directions available

## Usage in Code

```typescript
// Register spritesheet
this.load.spritesheet('attacker', 'assets/attacker/attacker-spritesheet.png', {
  frameWidth: 56,
  frameHeight: 56
});

// Create animations
const animationSystem = new AnimationSystem();

// Idle (8 directions)
for (let i = 0; i < 8; i++) {
  const dir = ['down', 'downright', 'right', 'upright', 'up', 'upleft', 'left', 'downleft'][i];
  animationSystem.add(`idle_${dir}`, new Animation({
    frames: [i],
    frameRate: 1,
    style: 'static'
  }));
}

// Punch (partial - only some directions)
animationSystem.add('punch_left', new Animation({
  frames: [8, 9, 10, 11, 12, 13],
  frameRate: 24,
  style: 'static'
}));
```

## Recommendations

1. **Complete cross-punch animation** for all 8 directions (currently missing north-west and incomplete north)
2. **Add walk animations** for all 8 directions (currently only south)
3. **Add running animations** for all 8 directions (currently only south)
4. **Standardize frame counts** - all animations should have same number of frames per direction for consistency
