# Recent Changes and Updates

## February 2026

### Scene Cleanup on Level Load

**Problem**: When switching levels, artifacts from the previous level (overlays, graphics, sprites) remained visible.

**Solution**: Comprehensive cleanup in `GameScene.loadLevel()`:
- Clear all timer events: `this.time.removeAllEvents()`
- Destroy all game objects except HUD elements
- Destroy scene renderer (graphics and sprites)
- Destroy overlay system

**Files Changed**:
- `src/scenes/GameScene.ts` - Added cleanup logic
- `src/systems/SceneOverlays.ts` - Added `destroy()` method
- `src/scenes/theme/GameSceneRenderer.ts` - Updated `destroy()` to clear graphics

### Scene Renderer Refactor (March 2026)

**Problem**: Background texture sprites (rocks, decorations) in water cells were rendering on top of the player.

**Root Cause**: `Grid.setCell()` was creating background texture sprites at depth -50 every time a cell was updated. This happened after `GameSceneRenderer` created them at the correct depth, causing duplicates at the wrong depth.

**Solution**: 
1. Removed sprite creation from `Grid.setCell()` - Grid now only tracks cell data, never creates sprites
2. Refactored `GameSceneRenderer.renderGrid()` into three methods:
   - `loadAllAssets()` - Load assets and generate tilesets (once)
   - `initializeSprites()` - Create all sprites in explicit order (once)
   - `updateGraphics()` - Update graphics objects (every frame)
3. Background textures in water now use `Depth.waterTexture` (-80) to render above water tiles (-100) but below swimming player (-70)
4. Removed cache system (`isCached` flag) - sprites created once via `spritesInitialized` flag

**Files Changed**:
- `src/scenes/theme/GameSceneRenderer.ts` - Split renderGrid into three methods, removed cache
- `src/scenes/GameScene.ts` - Updated create() and loadLevel() to use new flow
- `src/systems/grid/Grid.ts` - Removed sprite creation from setCell()
- `src/constants/DepthConstants.ts` - Updated underwaterTexture depth to -80

**Key Insight**: Only GameSceneRenderer should create sprites. Grid manages data only.

### Shadow Component Consolidation (March 2026)

**Problem**: Two different ShadowComponent implementations existed (core/ and visual/), causing runtime errors.

**Solution**: 
- Deleted old `core/ShadowComponent` 
- All entities now use `visual/ShadowComponent` with public `shadow` sprite and `props`
- Updated imports in BugEntity, RockEntity, FireballEntity, StalkingRobotEntity, PlayerEntity

**Swimming Shadow Behavior**:
- Alpha reduced to 30% (from 60%)
- Position moved down 32px
- Depth set to -80 (shadowSwimming)

### Dynamic Asset Loading

**Problem**: All assets were loaded at startup, increasing initial load time.

**Solution**: Level-specific asset loading system:
- Assets organized into groups (player, enemies, core)
- Level JSON analyzed to determine required assets
- Background textures extracted from level config
- Only required assets loaded per level

**Files Changed**:
- `src/assets/AssetRegistry.ts` - Added `ASSET_GROUPS`
- `src/assets/AssetLoader.ts` - Added `preloadLevelAssets()`, `getRequiredAssetGroups()`
- `src/scenes/GameScene.ts` - Integrated dynamic loading in `loadLevel()`

**Usage**:
```typescript
const levelData = await LevelLoader.load(levelName);
preloadLevelAssets(this, levelData);
await new Promise<void>(resolve => {
  if (this.load.isLoading()) {
    this.load.once('complete', () => resolve());
  } else {
    resolve();
  }
  this.load.start();
});
```

### HUD Button Alpha States

**Problem**: HUD buttons were always at the same opacity, making it unclear when they were active or on cooldown.

**Solution**: Three-state alpha system:
- **Unpressed**: 0.4 (faded)
- **Pressed**: 0.9 (bright)
- **Cooldown**: 0.2 (very faded, slide button only)

**Files Changed**:
- `src/ecs/components/input/AttackButtonComponent.ts` - Added alpha constants and state management
- `src/ecs/components/input/SlideButtonComponent.ts` - Added three-state alpha logic

### Bug Base Spawn Animation

**Problem**: Bug base spawn animation used `Back.easeOut` which caused overshoot (scaling larger than target before settling).

**Solution**: Changed easing to `Cubic.easeOut` for smooth scaling without overshoot.

**Files Changed**:
- `src/ecs/components/visual/BaseSpawnComponent.ts` - Changed easing function

## Breaking Changes

None. All changes are backward compatible.

## Migration Guide

### If you have custom levels:

No changes needed. The asset loading system automatically detects required assets from your level JSON.

### If you added custom assets:

1. Add to `ASSET_REGISTRY` in `src/assets/AssetRegistry.ts`
2. Add to appropriate group in `ASSET_GROUPS`
3. Update `getRequiredAssetGroups()` if needed for new enemy types

### If you created custom HUD buttons:

Follow the alpha state pattern:
```typescript
const ALPHA_UNPRESSED = 0.4;
const ALPHA_PRESSED = 0.9;
const ALPHA_COOLDOWN = 0.2; // if applicable

// In update() or event handlers:
sprite.setAlpha(isPressed ? ALPHA_PRESSED : ALPHA_UNPRESSED);
```

## Testing Checklist

When switching levels:
- [ ] No visual artifacts from previous level
- [ ] All overlays cleared
- [ ] Graphics cleared (no platform shading, etc.)
- [ ] Timer events cleared (no delayed spawns from old level)
- [ ] Console shows asset loading log
- [ ] Only required assets loaded (check console log)

When using HUD:
- [ ] Buttons fade when not pressed (alpha 0.4)
- [ ] Buttons brighten when pressed (alpha 0.9)
- [ ] Slide button very faded on cooldown (alpha 0.2)
- [ ] Attack button responds to touch and space bar
- [ ] Slide button disabled while punching

## Known Issues

None currently.

## Future Improvements

- Asset unloading: Currently assets accumulate across level switches. Consider unloading unused assets.
- Preloading: Show loading screen during asset loading
- Asset bundles: Group commonly used assets for faster loading
