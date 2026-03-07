# NPC1 Spritesheet

**File:** `npc1_spritesheet.png`  
**Frame Size:** 56x56 pixels  
**Sheet Dimensions:** 448x56 pixels (8x1 grid)  
**Total Frames:** 8 frames (idle rotations only)

## Frame Layout

All frames are idle/standing poses, one per direction.

| Frame | Direction    | Source File         |
|-------|-------------|---------------------|
| 0     | East        | rotations/east.png  |
| 1     | North-East  | rotations/north-east.png |
| 2     | North-West  | rotations/north-west.png |
| 3     | North       | rotations/north.png |
| 4     | South-East  | rotations/south-east.png |
| 5     | South-West  | rotations/south-west.png |
| 6     | South       | rotations/south.png |
| 7     | West        | rotations/west.png  |

## Usage

```typescript
// In AssetRegistry.ts
npc1: {
  key: 'npc1',
  path: 'assets/npc/npc1/npc1_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 56, frameHeight: 56 }
}

// Create idle animations
const DIRECTIONS = ['east', 'north-east', 'north-west', 'north', 'south-east', 'south-west', 'south', 'west'];
DIRECTIONS.forEach((dir, index) => {
  scene.anims.create({
    key: `npc1_idle_${dir}`,
    frames: [{ key: 'npc1', frame: index }],
    frameRate: 1
  });
});
```
