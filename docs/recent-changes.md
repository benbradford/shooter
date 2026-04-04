# Recent Changes and Updates

## April 2026

### Editor: Drag-to-Move Entities

**Change**: Removed the Move tool button. Entities are now moved by click-and-drag in Select mode.

**How it works:**
- Click an entity in Select mode to select it
- Keep holding and drag to reposition it cell-by-cell
- Release to finalize position

**Files Changed:**
- `editor/CanvasInteraction.ts` — Added `dragEntityId` tracking, removed `handleMove` method and `move` tool branch
- `editor/panels/Toolbar.ts` — Removed Move from GRID_TOOLS array

### Editor: Dropdown Auto-Blur

**Change**: All dropdowns (level, entity type, theme) now blur after selection so WASD camera movement works immediately.

**Problem**: After selecting a level from the dropdown, the `<select>` retained focus. `isHtmlInputFocused()` returned true, blocking WASD.

**Files Changed:**
- `editor/panels/Toolbar.ts` — Added `.blur()` after change handlers for all three dropdowns

### Editor: Trigger/Exit Entity ID Fix

**Change**: `createTriggerEntity` now accepts an `entityId` prop instead of hardcoding `'trigger'`.

**Problem**: All trigger entities (including exit-internal triggers) got ID `'trigger'`, causing editor lookups to fail with "No level data found".

**Fix:**
- Regular triggers get their actual ID (e.g., `trigger0`)
- Exit-internal triggers get `{exitId}_trigger` (e.g., `exit1_trigger`)
- Editor resolves `*_trigger` IDs back to parent exit entity for display and editing

**Files Changed:**
- `src/trigger/TriggerEntity.ts` — Added `entityId` to props, use it in `new Entity()`
- `src/systems/EntityLoader.ts` — Pass `entityId` for both trigger and exit cases
- `editor/panels/ContextPanel.ts` — Resolve `*_trigger` IDs to parent exit in `showEntityForm`

### Editor: Transform Override in Cell Form

**Change**: Cell form now shows transform override fields (scaleX, scaleY, offsetX, offsetY) when a texture is set.

**Files Changed:**
- `editor/panels/ContextPanel.ts` — Read transform from `levelData.cells`, show fields, wire Apply Transform button

### Editor: Data Entity Selection via Trigger Cells

**Change**: Clicking on highlighted trigger/exit cells now selects the corresponding data entity and opens its property form.

**Files Changed:**
- `editor/CanvasInteraction.ts` — Check `triggerCells` in `handleSelect` when no sprite entity hit
- `editor/EditorBridge.ts` — Added `selectDataEntity` method and `onDataEntityClicked` callback
- `editor/panels/PanelController.ts` — Wire `onDataEntityClicked` to `showDataEntityForm`
- `editor/panels/ContextPanel.ts` — Added `showDataEntityForm` using fake entity shell

### Editor: Entity Hit Detection Fix

**Change**: Entity selection uses transform position + cell-size hit area instead of sprite bounds.

**Problem**: Bug bases (and other entities with spawn animations) had zero-scale sprites in editor mode, making `getBounds()` return empty rects.

**Files Changed:**
- `editor/CanvasInteraction.ts` — Use `TransformComponent` position with `halfCell` distance check

### Editor: Grid Resize Minimum Reduced

**Change**: Grid can now be resized down to 1×1 (was 10×10).

**Files Changed:**
- `editor/panels/ContextPanel.ts` — Changed minimum from 10 to 1
- `editor/EditorBridge.ts` — Changed minimum from 10 to 1

### Editor: All Enemy Assets Loaded

**Change**: Editor now preloads all enemy asset groups so entity sprites render and can be clicked.

**Files Changed:**
- `src/scenes/GameScene.ts` — Added all enemy groups to editor preload

### Editor: Grid Tool Consolidation

**Change**: Replaced 7 individual grid tool buttons (Floor, Wall, Platform, Stairs, Water, Bridge, Blocked) with single Grid button that opens a sub-panel with property checkboxes and layer radio buttons (0, 1, 2). Also removed the Texture tool button (textures applied via cell form).

**Files Changed:**
- `editor/panels/Toolbar.ts` — Replaced GRID_TOOLS with Select/Grid/Entity, added sub-panel
- `editor/EditorBridge.ts` — Added `gridProperties` Set and `gridLayer`, simplified `paintCell`

### Editor: Trigger Cell Editing

**Change**: Triggers and exits now have an Edit Cells button. Click it to enter cell editing mode where clicking grid cells toggles them as trigger cells.

**Files Changed:**
- `editor/panels/ContextPanel.ts` — Added Edit Cells button to trigger/exit forms
- `editor/CanvasInteraction.ts` — Handle cell toggle when `editingTriggerCells` is active
- `editor/EditorBridge.ts` — Added `editingTriggerCells` state

### Editor: Entity Sprite Visibility Fix

**Change**: All entity sprites forced to alpha 1 and non-zero scale in editor mode. Entities with spawn animations (bug bases) now visible and scaled to fit cell size.

**Files Changed:**
- `src/scenes/GameScene.ts` — Force sprite alpha/scale after entity load in editor mode

### Editor: Texture Drag-to-Move

**Change**: Click and hold a cell with a background texture in Select mode, then drag to move the texture to another cell.

**Files Changed:**
- `editor/CanvasInteraction.ts` — Added `dragTextureFrom` tracking
- `editor/EditorBridge.ts` — Added `moveCellTexture` method

### Editor: Click Cycling

**Change**: When multiple entities share a cell, repeated clicks cycle through all entities at that position, then data entities (triggers/exits), then the cell itself.

**Files Changed:**
- `editor/CanvasInteraction.ts` — Collect all candidates at cell, cycle on repeated clicks

## March 2026

### HUD Button Visual Overhaul

**Change**: HUD buttons now use stone ring frames with dark background plates instead of white circle outlines.

**What changed:**
- Attack, slide, and pet ability buttons use `stone_ring.png` and `stone_bg.png` sprites
- Soft circular shadow behind each button for depth separation
- Opacity increased: 0.9 unpressed, 1.0 pressed (was 0.4/0.9)
- Movement joystick circles changed to blue (`0x4488ff`) with filled inner circle
- Pet/slide button moved left to 68% (was 75%) and scaled up 30%

**Scale mode changed:** `Phaser.Scale.FIT` → `Phaser.Scale.EXPAND` to fill screen without letterboxing or cropping.

**Camera bounds inset:** Reduced from 24px to 0px to allow camera to reach full map edges.

**Depth layering:** hudShadow (1997) → hudRing (1998) → hudButtonBg (1999) → hud (2000)

**Files Changed:**
- `src/main.ts` - Scale mode to EXPAND
- `src/constants/GameConstants.ts` - Camera bounds inset to 0
- `src/constants/DepthConstants.ts` - Added hudShadow, hudRing, hudButtonBg
- `src/ecs/components/input/AttackButtonComponent.ts` - Stone ring + bg + shadow
- `src/ecs/components/input/SlideButtonComponent.ts` - Stone ring + bg + shadow
- `src/ecs/components/ui/PetActionButtonComponent.ts` - Stone ring + bg + shadow
- `src/ecs/components/ui/JoystickVisualsComponent.ts` - Blue color, filled inner circle
- `src/assets/AssetRegistry.ts` - Added stone_ring, stone_bg, hud_rings
- `public/assets/player/stone_ring.png` - New asset (extracted from hud_rings)
- `public/assets/player/stone_bg.png` - New asset (extracted from hud_rings)

### Spritesheet Background Textures

**Change**: `BackgroundTextureConfig` now supports `sourceRect` for extracting a region from a larger spritesheet image.

**How it works:**
- `sourceRect: { x, y, width, height }` crops a region from the source image
- Renderer creates a Phaser texture frame on-the-fly from the source rect
- Editor has spritesheet picker: green 📋 buttons open a sub-sprite selection panel
- Spritesheet definitions in `src/editor/SpritesheetTextures.ts`

**Files Changed:**
- `src/systems/level/LevelLoader.ts` - Added `SourceRect` type and `sourceRect` to `BackgroundTextureConfig`
- `src/scenes/theme/GameSceneRenderer.ts` - Handle `sourceRect` when creating background sprites
- `src/editor/SpritesheetTextures.ts` - New file defining spritesheet sprite bounds
- `src/editor/TextureEditorState.ts` - Spritesheet picker UI
- `src/assets/AssetRegistry.ts` - Added `wilds_props` and `rocks_spritesheet`

### Editor Black Screen Fix

**Problem**: Entering editor mode caused the game scene to go black.

**Cause**: `resetScene()` triggers `camera.fadeIn(500)` but the scene is paused immediately after, so the fade never completes.

**Fix**: Skip camera fade-in when `isEditorMode` is true; set background/vignette alpha directly instead.

### Background Texture Transforms in JSON

**Change**: Transform overrides for background textures moved from code to level JSON files.

**Before**: Hardcoded in `GameSceneRenderer.ts`:
```typescript
const BACKGROUND_TEXTURE_TRANSFORM_OVERRIDES = {
  house1: { scaleX: 4, scaleY: 4, offsetX: 23, offsetY: 0 },
  // ...
};
```

**After**: Stored in level JSON:
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

**Benefits**:
- Data-driven: No code changes needed for new textures with transforms
- Per-instance: Each cell can have different transforms for the same texture
- Editor-friendly: Transforms preserved when editing levels

**Backward compatible**: String format `"backgroundTexture": "texture_name"` still works.

### Asset Management System

**Problem**: Animated textures crashed when re-entering levels due to stale animation references after texture unload/reload.

**Solution**: Created centralized AssetManager singleton that tracks asset dependencies and automatically cleans them up:

- `AssetManager.registerDependency(assetKey, type, dependencyKey)` - Track that a dependency relies on an asset
- `AssetManager.unload(scene, assetKey)` - Unload asset and all its dependencies
- `AssetManager.unloadBatch(scene, assetKeys)` - Batch unload with automatic cleanup

**Integration**:
- GameSceneRenderer registers animation dependencies when creating animations
- GameScene uses AssetManager for all texture unloading
- Animations are automatically removed before their textures are unloaded

**Files Changed**:
- `src/systems/AssetManager.ts` - New singleton for dependency tracking
- `src/scenes/theme/GameSceneRenderer.ts` - Register animation dependencies
- `src/scenes/GameScene.ts` - Use AssetManager for unloading

**Benefits**:
- No more manual cleanup code scattered across files
- Adding new asset types (tilesets, particle configs) is straightforward
- Explicit dependency tracking makes code easier to reason about
- Prevents entire class of "stale reference" bugs

## February 2026

### Scene Cleanup on Level Load

**Problem (March 2026):** When switching levels, old sprites remained visible and caused __MISSING texture errors.

**Solution:** 
- `GameScene.create()` calls `children.removeAll(true)` at start
- WorldState only loads from file once (static flag)
- URL parameter only used on first load (static flag)
- Runtime textures (UUIDs, gradients, tilesets) filtered from unload

**Files Changed:**
- `src/scenes/GameScene.ts` - Display list cleanup, static flags
- `src/scenes/LoadingScene.ts` - Runtime texture filtering
- `src/scenes/theme/*.ts` - Vignette texture key ('vignette' not 'vin')
- `src/assets/AssetRegistry.ts` - stalking_robot asset group

**Testing:** All 8 loading tests pass (see `test/tests/loading/`)

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
