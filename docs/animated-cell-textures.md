# Animated Cell Textures

Cells can have animated sprites (like flickering flames, flowing water, etc.) in addition to static background textures.

## Setup

### 1. Create Aligned Spritesheet

If you have misaligned frames from AI generation, see [Aligning Misaligned Sprites](./aligning-misaligned-sprites.md).

For a 2-frame animation:
```bash
magick frame1.png frame2.png +append spritesheet.png
```

### 2. Create Info File

Create `{spritesheet}_info.json` next to the spritesheet:

```json
{
  "frameWidth": 78,
  "frameHeight": 85,
  "frameCount": 2,
  "frameRate": 8
}
```

### 3. Register in AssetRegistry

```typescript
// src/assets/AssetRegistry.ts
sconce_flame: {
  key: 'sconce_flame',
  path: 'assets/interior/sconce_flame_spritesheet.png',
  type: 'spritesheet' as const,
  config: { frameWidth: 78, frameHeight: 85 }
}
```

### 4. Add to Level JSON

```json
{
  "col": 10,
  "row": 5,
  "backgroundTexture": "sconce_bg",
  "animatedTexture": {
    "spritesheet": "sconce_flame",
    "frameWidth": 78,
    "frameHeight": 85,
    "frameCount": 2,
    "frameRate": 8,
    "transformOverride": {
      "scaleX": 0.2,
      "scaleY": 0.2,
      "offsetX": 2,
      "offsetY": -12
    }
  }
}
```

## Features

- **Coexists with backgroundTexture** - Can have both static background and animated overlay
- **Random start frame** - Each cell starts at a random frame to avoid synchronization
- **Transform overrides** - Scale and position per-cell via `transformOverride`
- **Automatic loading** - Assets loaded automatically when level loads

## Transform Override

The `transformOverride` field is optional:

```json
"transformOverride": {
  "scaleX": 0.2,    // Scale relative to cell size
  "scaleY": 0.2,
  "offsetX": 2,     // Offset in pixels from cell center
  "offsetY": -12
}
```

If not specified, falls back to `ANIMATED_TEXTURE_TRANSFORM_OVERRIDES` constant in `GameSceneRenderer.ts`.

## Example: Sconce with Flame

**Static background:**
- `sconce_bg.png` - Wall mount and candle (static)
- `sconce_bg_flipped.png` - Horizontally flipped version

**Animated flame:**
- `sconce_flame_spritesheet.png` - 2 frames (156×85, each frame 78×85)
- `sconce_flame_spritesheet_info.json` - Animation config

**Level JSON:**
```json
{
  "col": 10,
  "row": 5,
  "layer": 1,
  "properties": ["platform"],
  "backgroundTexture": "sconce_bg",
  "animatedTexture": {
    "spritesheet": "sconce_flame",
    "frameWidth": 78,
    "frameHeight": 85,
    "frameCount": 2,
    "frameRate": 8,
    "transformOverride": {
      "scaleX": 0.2,
      "scaleY": 0.2,
      "offsetX": 2,
      "offsetY": -12
    }
  }
}
```

## Rendering Details

- **Depth**: Animated textures render at `Depth.cellTextureModified + 1` (above background textures)
- **Animation**: Loops forever with specified frame rate
- **Performance**: One sprite per cell with animated texture

## Related Files

- `src/systems/level/LevelLoader.ts` - AnimatedTextureConfig type
- `src/scenes/theme/GameSceneRenderer.ts` - Rendering logic
- `src/assets/AssetLoader.ts` - Asset loading
- `docs/aligning-misaligned-sprites.md` - Fixing AI-generated frames
