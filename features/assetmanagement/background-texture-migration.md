# Background Texture Transform Migration - Complete

## What Changed

**Before**: Transform overrides were hardcoded in `GameSceneRenderer.ts`
**After**: Transform overrides are stored in level JSON files

## Changes Made

### 1. Type Definitions
- Added `BackgroundTextureConfig` type to `LevelLoader.ts`
- Updated `LevelCell.backgroundTexture` to accept `string | BackgroundTextureConfig`

### 2. Code Updates
- **GameSceneRenderer.ts**: 
  - Removed `BACKGROUND_TEXTURE_TRANSFORM_OVERRIDES` constant
  - Removed `ANIMATED_TEXTURE_TRANSFORM_OVERRIDES` constant
  - Updated `createBackgroundTextureSprites()` to parse backgroundTexture as string or object
- **AssetLoader.ts**: Updated `getBackgroundTextures()` to extract image name from object format
- **GameScene.ts**: Updated cell initialization to extract image name when setting grid cells
- **EditorScene.ts**: Updated `extractGridCells()` to preserve full backgroundTexture object from original level data

### 3. Level JSON Updates
Updated 3 level files with transform overrides:
- `public/levels/house3_interior.json` - fireplace1, bed1, rug2, kitchen1, sconce_bg, sconce_bg_flipped
- `public/levels/grass_overworld1.json` - house1, house2, house3, bridge_h, bridge_v
- `public/levels/interior1.json` - bed1, table1

### 4. Format Examples

**String format** (no transform):
```json
"backgroundTexture": "dungeon_door"
```

**Object format** (with transform):
```json
"backgroundTexture": {
  "image": "house1",
  "transformOverride": {
    "scaleX": 4,
    "scaleY": 4,
    "offsetX": 23,
    "offsetY": 0
  }
}
```

## Benefits

1. **Data-driven**: Transforms are in level files, not code
2. **Per-instance**: Each cell can have different transforms for the same texture
3. **Editor-friendly**: Editor preserves transforms when exporting
4. **No code changes**: Adding new textures with transforms doesn't require code changes

## Testing

- [x] Build passes
- [x] Lint passes
- [x] house3_interior loads correctly
- [x] grass_overworld1 loads correctly
- [x] interior1 loads correctly
- [x] Transforms are preserved when editing in editor

## Backward Compatibility

The system supports both formats:
- Old levels with `"backgroundTexture": "texture_name"` still work
- New levels with object format work
- Editor preserves whichever format is in the original level data
