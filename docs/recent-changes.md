# Recent Changes and Updates

## April 2026

### Collectible Entity System

**Change**: New `collectible` entity type for placeable pickup items. Collectibles bob, pulse, and glow. Walking near one collects it and increments a world state flag.

**Preset system**: Collectibles use named presets (e.g., `mist_orb`) that define texture, flag name, and tint color. New presets added to `PRESETS` in `CollectibleEntity.ts`.

**World state**: Collecting increments `{flagName}` (e.g., `mist_orb: "3"`) and sets `show_{flagName}s: "true"` on first pickup.

**HUD counter**: `MistOrbCounterComponent` shows cyan orb count in top-right when `show_mist_orbs` flag is `"true"`.

**Files Created:**
- `src/ecs/components/pickup/CollectibleComponent.ts` — Proximity detection + flag increment
- `src/ecs/components/visual/CollectibleVisualComponent.ts` — Bobbing + glow effect
- `src/ecs/entities/collectible/CollectibleEntity.ts` — Factory with preset system
- `src/ecs/components/ui/MistOrbCounterComponent.ts` — HUD counter (lazy-created)

**Files Changed:**
- `src/systems/level/LevelLoader.ts` — Added `'collectible'` to `EntityType`
- `src/systems/EntityLoader.ts` — Added collectible case
- `src/assets/AssetRegistry.ts` — Registered `mist_orb`, added `collectibles` group, added to `core` group
- `src/assets/AssetLoader.ts` — Load `collectibles` group when level has collectible entities
- `src/ecs/entities/hud/JoystickEntity.ts` — Added `MistOrbCounterComponent`
- `editor/panels/Toolbar.ts` — Added `'collectible'` to entity dropdown
- `editor/EditorBridge.ts` — Added defaults + extraction logic
- `editor/CanvasInteraction.ts` — Added `'CO'` label

### Wilds Theme: Configurable Mist Intensity

**Change**: `WildsSceneRenderer` now accepts optional `mistConfig` from level JSON for per-level mist intensity.

**Usage:**
```json
{
  "levelTheme": "wilds",
  "mistConfig": {
    "baseAlpha": 0.6,
    "alphaRange": 0.4,
    "baseScale": 70,
    "scaleRange": 60
  }
}
```

**Defaults** (match original behavior): `baseAlpha: 0.3`, `alphaRange: 0.7`, `baseScale: 45`, `scaleRange: 50`

**Files Changed:**
- `src/scenes/theme/WildsSceneRenderer.ts` — Added `WildsMistConfig`, constructor parameter
- `src/systems/level/LevelLoader.ts` — Added `mistConfig` to `LevelData`
- `src/scenes/GameScene.ts` — Pass `mistConfig` to renderer
- `src/scenes/LoadingScene.ts` — Pass `mistConfig` to renderer

### Lua Runtime: getFlag Helper

**Change**: Added `getFlag(name)` to Lua runtime. Returns flag value as string, or empty string if not set.

**Usage in Lua:**
```lua
local count = getFlag("mist_orb")
say("NPC", "You have " .. count .. " orbs", 50, 3000)
```

**Files Changed:**
- `src/systems/LuaRuntime.ts` — Added `getFlag` global function

### Speech Box: Cyan Color Tag

**Change**: Added `<cyan>` to inline color tags for speech text.

**Usage:** `say("NPC", "Collect <cyan>mist orbs</cyan> for me", 50, 3000)`

**Files Changed:**
- `src/ecs/components/ui/SpeechBoxComponent.ts` — Added `cyan` to regex and color map

### Speech Box: Dismiss Fix

**Change**: Fixed two issues where speech boxes could get stuck:
1. After text finishes animating, first press now dismisses immediately (was requiring two presses)
2. If space pressed in the gap between text completion and dismiss listener setup, dismiss is no longer lost

**Files Changed:**
- `src/ecs/components/ui/SpeechBoxComponent.ts` — Set `isSkipping = true` after animation, early return in `waitForDismiss` if already dismissed

### NPC Animation: Stale Frame Fix

**Change**: NPC animations now detect and recreate stale frames after texture unload/reload during level transitions.

**Problem**: NPC texture unloaded during transition, reloaded on re-entry, but global animation still referenced old (null) frames → crash.

**Files Changed:**
- `src/ecs/entities/npc/NPCAnimations.ts` — Check frame validity, remove and recreate if stale

### Breakable: Rarity Guard

**Change**: Added guard in `spawnCoins` for unknown rarity values to prevent crash.

**Files Changed:**
- `src/ecs/components/breakable/BreakableComponent.ts` — Guard against undefined `coinRange`

### Lua Runtime: saveState and teleportTo

**Change**: Added `saveState()` and `player.teleportTo(col, row)` to Lua runtime.

**Files Changed:**
- `src/systems/LuaRuntime.ts` — Added `saveState`, `teleportTo` commands

### NPC Animation: Custom Animations

**Change**: NPC spritesheets can now include extra animations beyond the 8 idle frames. Defined via `NPC_ANIM_METADATA` in `NPCAnimations.ts`. Playable from Lua via `npc.playAnim(animKey, repeatType)`.

**Files Changed:**
- `src/ecs/entities/npc/NPCAnimations.ts` — Added `NPC_ANIM_METADATA`, extra animation creation
- `src/ecs/entities/npc/NPCIdleComponent.ts` — Added `setPaused()` to prevent idle overriding custom anims
- `src/systems/LuaRuntime.ts` — Added `npcPlayAnim` command

### NPC: New Spritesheets

**Change**: Added `village_boy` and `village_swim_teacher` NPC spritesheets (48×48 frames, 8 directions). `village_swim_teacher` includes a 6-frame push animation.

**Files Changed:**
- `src/assets/AssetRegistry.ts` — Registered spritesheets + asset groups

### Title Screen: Scene Ordering Fix

**Change**: Without `?level=` param, TitleScene now starts first (was GameScene). Prevents race condition where GameScene briefly loads `default.json` before profile is selected.

**Files Changed:**
- `src/main.ts` — Conditional scene ordering based on `startWithGame`

### World State: Modified Cells Fix

**Change**: Fixed `updateModifiedCells` incorrectly saving cells with object-format `backgroundTexture` (e.g., `{ image, sourceRect }`) as modified. Now extracts the `image` field for comparison.

**Files Changed:**
- `src/systems/WorldStateManager.ts` — Handle object backgroundTexture in comparison

### Editor: Breakable Extraction Fix

**Change**: Breakable entity properties (texture, health, rarity) now read from `levelData` instead of live components, so editor changes persist on save.

**Files Changed:**
- `editor/EditorBridge.ts` — Read breakable data from `existingLevelData`

### Pathfinder: Water Traversal

**Change**: Pathfinder now supports water traversal via `allowWater` flag. `InteractionComponent.moveTo` sets this based on `canSwim` world state flag.

**Files Changed:**
- `src/systems/Pathfinder.ts` — Added `allowWater` property
- `src/ecs/components/interaction/InteractionComponent.ts` — Set `allowWater` from `canSwim` flag

### canPunch World State Flag

**Change**: Punching now requires `canPunch` flag set to `"true"` in world state. Attack button hidden when `canPunch` is false, unless NPC interaction is available (shows lips icon).

**Files Changed:**
- `src/ecs/entities/player/PlayerStateHelpers.ts` — Gate `tryStartPunch` on `canPunch` flag
- `src/ecs/components/input/AttackButtonComponent.ts` — Hide button when `canPunch` false, show for NPC interactions
- `public/states/default.json`, `public/states/empty.json` — Added `canPunch: "false"`

### canSwim Bridge Fix

**Change**: Players can now cross bridge cells even when `canSwim` is `"false"`. Previously the water check blocked all cells with the `water` property, including bridge+water cells.

**Files Changed:**
- `src/ecs/components/movement/GridCollisionComponent.ts` — Exclude bridge cells from canSwim block

### NPC: facePlayer Direction

**Change**: NPCs can now be set to `"facePlayer"` direction, making them always face toward the player.

**Files Changed:**
- `src/ecs/entities/npc/NPCIdleComponent.ts` — Added `facePlayer` mode with per-frame direction update
- `src/ecs/entities/npc/NPCEntity.ts` — Added `facePlayer` prop
- `src/systems/EntityLoader.ts` — Pass `facePlayer` when direction is `'facePlayer'`
- `editor/panels/ContextPanel.ts` — Added `facePlayer` to direction dropdown
- `editor/EditorBridge.ts` — Handle `facePlayer` in direction update and extraction

### NPC: Transform Override

**Change**: NPCs now support `transformOverride` with `scaleX`, `scaleY`, `offsetX`, `offsetY` for per-instance sizing and positioning.

**Files Changed:**
- `src/ecs/entities/npc/NPCIdleComponent.ts` — Added `NPCTransformOverride`, applied each frame
- `src/ecs/entities/npc/NPCEntity.ts` — Pass `transformOverride` to idle component
- `src/systems/EntityLoader.ts` — Pass `transformOverride` from JSON
- `editor/panels/ContextPanel.ts` — Transform fields with live preview
- `editor/EditorBridge.ts` — Sync transform override to live component

### NPC: New Spritesheets

**Change**: Added `village_old_man`, `village_girl`, `village_wizard` NPC spritesheets (68×68 frames, 8 directions).

**Files Changed:**
- `src/assets/AssetRegistry.ts` — Registered spritesheets + individual asset groups
- `public/assets/npc/village_*/` — Spritesheets and metadata

### Editor: Entity Copy/Paste

**Change**: Ctrl+C copies selected entity (all properties including difficulty, createOnAnyEvent, etc.). Click a cell, Ctrl+V pastes a clone with unique ID.

**Files Changed:**
- `editor/EditorBridge.ts` — `copySelectedEntity()`, `pasteEntity()` methods
- `editor/CanvasInteraction.ts` — Ctrl+C/V keyboard handling

### Editor: Camera Preserved on Entity Add

**Change**: Adding an entity no longer snaps the camera back to start. Camera position and zoom are saved before scene restart and restored after.

**Files Changed:**
- `editor/EditorBridge.ts` — Save/restore camera in `addEntity()`, auto-select new entity

### Editor: Blocked Areas Tool

**Change**: New "Area" tool for drawing convex polygon blocked areas. Player collision uses SAT with MTV push-out. Enemies use cell-based avoidance.

**Files Changed:**
- `src/math/PolygonUtils.ts`, `src/math/SATCollision.ts` — Polygon math
- `src/systems/BlockedAreaManager.ts` — Polygon validation and spatial queries
- `src/ecs/components/movement/BlockedAreaCollisionComponent.ts` — Player polygon collision
- `editor/CanvasInteraction.ts` — Drawing tool, selection, rendering
- `editor/EditorBridge.ts` — Blocked area mutations
- `editor/panels/ContextPanel.ts` — Layer/blocksProjectiles editing

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

### Red Skeleton Enemy

**Change**: New `red_skeleton` enemy type. Red-tinted skeleton that splits into 4 mini skeletons on death. Mini skeletons are half-size, inherit difficulty, throw smaller bones.

**Files Changed:**
- `src/ecs/entities/red_skeleton/RedSkeletonEntity.ts` — Red-tinted skeleton with split-on-death
- `src/ecs/entities/red_skeleton/RedSkeletonDeathState.ts` — Spawns red bone particles + mini skeletons
- `src/systems/EntityLoader.ts` — `red_skeleton` case + `spawnMiniSkeletons` method
- `src/systems/level/LevelLoader.ts` — Added `red_skeleton` to EntityType
- `src/ecs/components/visual/HitFlashComponent.ts` — Added `baseTint` parameter
- `src/ecs/entities/skeleton/BoneProjectileEntity.ts` — Added `tint` and `scaleOverride` props
- `src/assets/AssetRegistry.ts` — `red_skeleton` asset group
- `src/assets/AssetLoader.ts` — Load skeleton assets for `red_skeleton` type

### Water Blocks Enemy Movement

**Change**: Enemies can no longer walk on water. Water cells block pathfinding and grid collision for all entities without `WaterEffectComponent`. Bridge+water cells remain walkable.

**Files Changed:**
- `src/systems/Pathfinder.ts` — Block water cells (unless bridge) in `getValidNeighbor`
- `src/ecs/components/movement/GridCollisionComponent.ts` — Block water for entities without `WaterEffectComponent`
- `src/ecs/components/movement/KnockbackComponent.ts` — Block knockback into water cells

### Editor: Keyboard Isolation

**Change**: G and C key debug toggles no longer fire when typing in editor form fields. Both keys are now only registered in game mode.

**Files Changed:**
- `src/systems/grid/Grid.ts` — Skip G/C key registration in editor mode

### Editor: Resizable Panels, State Tab, Level Info Improvements

**Changes:**
- Draggable divider between canvas and panel (200px–600px)
- **Level** and **State** buttons added to tool row
- Level Info panel: editable player start position, theme dropdown, data entities list (interactions/eventchainers/cellmodifiers)
- State panel: edit player health, coins, flags with Save State button
- State panel: Clear button per level + Clear All button to reset level states
- Animated texture editing in cell form (add/remove/transform)
- Exit form: Leave button loads target level
- Remembers last edited level via localStorage
- Toast moved to bottom-right (no longer covers toolbar)
- Zoom sensitivity halved

**Files Changed:**
- `editor/main.ts` — Divider drag logic, localStorage level persistence
- `editor/editor.css` — Divider styles, panel resize, toast position
- `editor/index.html` — Added divider element
- `editor/panels/Toolbar.ts` — Level/State buttons, entity dropdown init fix
- `editor/panels/ContextPanel.ts` — State panel, Level Info improvements, animated texture editing
- `editor/panels/PanelController.ts` — State/Level panel routing
- `editor/EditorBridge.ts` — onToolChanged callback, save-state support
- `editor/CanvasInteraction.ts` — Level/State tool handling, zoom step
- `vite.config.ts` — Added `/api/save-state` endpoint

### Editor: Drag-to-Move Entities

**Change**: Removed the Move tool button. Entities are now moved by click-and-drag in Select mode.

**How it works:**
- Click an entity in Select mode to select it
- Keep holding and drag to reposition it cell-by-cell
- Release to finalize position

**Files Changed:**
- `editor/CanvasInteraction.ts` — Added `dragEntityId` tracking, removed `handleMove` method and `move` tool branch
- `editor/panels/Toolbar.ts` — Removed Move from GRID_TOOLS array

### canSwim World State Flag

**Change**: Water now blocks player movement unless the `canSwim` flag is `"true"` in world state. Replaced compile-time `CAN_SUBMERGE` constant with runtime flag check.

**Files Changed:**
- `src/ecs/components/movement/GridCollisionComponent.ts` — Check `canSwim` flag instead of `CAN_SUBMERGE`
- `src/ecs/entities/player/PlayerEntity.ts` — Always add WaterEffectComponent
- `src/constants/GameConstants.ts` — Removed `CAN_SUBMERGE`
- `public/states/default.json` — Added `canSwim: "false"`

### Water Config: Customizable Ripples and Splash

**Change**: Water config in level JSON now supports `rippleSpritesheet` and `splashParticle` fields for per-level water effects.

**Usage:**
```json
"water": {
  "sourceImage": "murky_water",
  "rippleSpritesheet": "murky_ripple",
  "splashParticle": "murky_splash"
}
```

**Files Changed:**
- `src/systems/level/LevelLoader.ts` — Added `rippleSpritesheet` and `splashParticle` to water type
- `src/ecs/components/visual/WaterRippleComponent.ts` — Configurable texture key
- `src/ecs/components/visual/WaterEffectComponent.ts` — Configurable splash texture key
- `src/ecs/entities/player/PlayerEntity.ts` — Pass water config to components
- `src/scenes/GameScene.ts` — Create ripple animation from level config
- `src/assets/AssetRegistry.ts` — Added `murky_ripple` spritesheet

### Overlay Map Masking

**Change**: Scene overlays are now masked to the grid boundaries so they don't render outside the map on narrow levels.

**Files Changed:**
- `src/systems/SceneOverlays.ts` — Added geometry mask covering grid area

### cellModifierCells Removal

**Change**: Removed redundant `cellModifierCells` from world state. `modifiedCells` alone is sufficient — cells that actually changed get saved, cells that didn't don't need saving.

**Files Changed:**
- `src/systems/WorldState.ts` — Removed `cellModifierCells` from types
- `src/systems/WorldStateManager.ts` — Removed `addCellModifierCells`, simplified `updateModifiedCells`
- `src/ecs/components/core/CellModifierComponent.ts` — Removed tracking call

### Title Screen and Profile System

**Change**: Game now starts with a title screen → profile select → game flow (unless `?level=` is specified).

**Features:**
- Title screen with "Touch To Start" flashing text
- 3 profile slots showing time played (HH:MM:SS) or "Empty"
- New profiles created from `empty.json` template
- Existing profiles show Play/Delete options with confirmation
- `timePlayed` field tracks real elapsed seconds, updated on level transitions and death
- State auto-saves on level transition and player death

**Files Created:**
- `src/scenes/TitleScene.ts`, `src/scenes/ProfileSelectScene.ts`
- `public/states/empty.json`

**Files Changed:**
- `src/main.ts` — Route to title or game based on `?level=` param
- `src/systems/WorldState.ts` — Added `timePlayed` field
- `src/systems/WorldStateManager.ts` — Profile-aware load/save, time tracking
- `src/scenes/GameScene.ts` — Read profileName, auto-save on transition
- `src/ecs/entities/player/PlayerDeathState.ts` — Auto-save on death
- `vite.config.ts` — Added profiles, create-profile, delete-profile API endpoints

### Health Regen While Moving

**Change**: Health regen timer accumulates at 0.3× speed while moving (vs 1× while still). Previously regen was completely blocked while moving.

**Files Changed:**
- `src/ecs/components/core/HealthComponent.ts` — Timer rate based on movement state

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

**Change**: Transform overrides moved from hardcoded `GameSceneRenderer.ts` to level JSON as `backgroundTexture: { image, transformOverride: { scaleX, scaleY, offsetX, offsetY } }`. Data-driven, per-instance, editor-friendly. String format still works.

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

**Problem:** Old sprites remained visible when switching levels.
**Fix:** `GameScene.create()` clears display list, WorldState loads from file only once, runtime textures filtered from unload.

### Scene Renderer Refactor

**Problem:** Background textures in water rendered on top of player due to `Grid.setCell()` creating duplicate sprites.
**Fix:** Grid only tracks data; `GameSceneRenderer` split into `loadAllAssets()`, `initializeSprites()`, `updateGraphics()`. Background textures in water use `Depth.waterTexture` (-80).

### Shadow Component Consolidation

Merged two ShadowComponent implementations into one (`visual/ShadowComponent`). Swimming shadow: 30% alpha, depth -80.

### Dynamic Asset Loading

Level-specific asset loading: assets organized into groups, level JSON analyzed for required assets, only needed assets loaded per level.

### HUD Button Alpha States

Three-state alpha: unpressed 0.4, pressed 0.9, cooldown 0.2 (slide only).

### Bug Base Spawn Animation

Changed easing from `Back.easeOut` to `Cubic.easeOut` to prevent overshoot.

## Breaking Changes

None. All changes are backward compatible.
