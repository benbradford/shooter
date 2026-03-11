# Sconce Spritesheet

**File:** `sconce_spritesheet.png`  
**Dimensions:** 1226×672 pixels  
**Frame Size:** 613×672 pixels  
**Frames:** 2

## Frame Layout

| Frame | X Offset | Y Offset | Width | Height |
|-------|----------|----------|-------|--------|
| 0     | 0        | 0        | 613   | 672    |
| 1     | 613      | 0        | 613   | 672    |

## Phaser Configuration

```typescript
// In AssetRegistry.ts
sconce: {
  key: 'sconce',
  path: 'assets/interior/sconce_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 613, frameHeight: 672 }
}

// Create animation
scene.anims.create({
  key: 'sconce_flicker',
  frames: scene.anims.generateFrameNumbers('sconce', { start: 0, end: 1 }),
  frameRate: 8,
  repeat: -1
});

// Use in sprite
const sconce = scene.add.sprite(x, y, 'sconce');
sconce.play('sconce_flicker');
```

## Notes

- Frames are aligned so the wall mount structure stays in the same position
- Only the flame animates between frames
- Frame rate of 8 fps gives a natural flicker effect
