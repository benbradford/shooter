# Thrower Sprite Sheet Layout

**File:** `thrower_spritesheet.png`  
**Dimensions:** 336x1536 pixels (7 columns × 32 rows)  
**Frame Size:** 48x48 pixels  
**Total Frames:** 224

## Frame Index Formula
```
frameIndex = row * 7 + column
```

## Layout by Animation Type

### Idle (Rows 0-7, 1 frame each)
Single frame per direction using rotation images.

| Row | Direction    | Frame Index | Column |
|-----|--------------|-------------|--------|
| 0   | south        | 0           | 0      |
| 1   | south-east   | 7           | 0      |
| 2   | east         | 14          | 0      |
| 3   | north-east   | 21          | 0      |
| 4   | north        | 28          | 0      |
| 5   | north-west   | 35          | 0      |
| 6   | west         | 42          | 0      |
| 7   | south-west   | 49          | 0      |

### Walking (Rows 8-15, 4 frames each)
4-frame walk cycle per direction.

| Row | Direction    | Start Index | Frames      |
|-----|--------------|-------------|-------------|
| 8   | south        | 56          | 56-59       |
| 9   | south-east   | 63          | 63-66       |
| 10  | east         | 70          | 70-73       |
| 11  | north-east   | 77          | 77-80       |
| 12  | north        | 84          | 84-87       |
| 13  | north-west   | 91          | 91-94       |
| 14  | west         | 98          | 98-101      |
| 15  | south-west   | 105         | 105-108     |

### Throw (Rows 16-23, 7 frames each)
7-frame throw animation per direction.

| Row | Direction    | Start Index | Frames      |
|-----|--------------|-------------|-------------|
| 16  | south        | 112         | 112-118     |
| 17  | south-east   | 119         | 119-125     |
| 18  | east         | 126         | 126-132     |
| 19  | north-east   | 133         | 133-139     |
| 20  | north        | 140         | 140-146     |
| 21  | north-west   | 147         | 147-153     |
| 22  | west         | 154         | 154-160     |
| 23  | south-west   | 161         | 161-167     |

### Death (Rows 24-31, 7 frames each)
7-frame falling-back death animation per direction.

| Row | Direction    | Start Index | Frames      |
|-----|--------------|-------------|-------------|
| 24  | south        | 168         | 168-174     |
| 25  | south-east   | 175         | 175-181     |
| 26  | east         | 182         | 182-188     |
| 27  | north-east   | 189         | 189-195     |
| 28  | north        | 196         | 196-202     |
| 29  | north-west   | 203         | 203-209     |
| 30  | west         | 210         | 210-216     |
| 31  | south-west   | 217         | 217-223     |

## Direction Order
All animations follow this 8-direction order:
1. south (down)
2. south-east
3. east (right)
4. north-east
5. north (up)
6. north-west
7. west (left)
8. south-west

## Usage Example

```typescript
// In AssetRegistry.ts
thrower: {
  key: 'thrower',
  path: 'assets/thrower/thrower_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 48, frameHeight: 48 }
}

// Creating animations
scene.anims.create({
  key: 'thrower_walk_south',
  frames: scene.anims.generateFrameNumbers('thrower', { start: 56, end: 59 }),
  frameRate: 10,
  repeat: -1
});

scene.anims.create({
  key: 'thrower_throw_east',
  frames: scene.anims.generateFrameNumbers('thrower', { start: 126, end: 132 }),
  frameRate: 12,
  repeat: 0
});
```

## Notes
- Character has brown hair and aggressive features (Metal Slug style)
- Originally holding a gun, suitable for throwing enemy type
- All frames are 48x48 pixels
- Transparent background (RGBA)
