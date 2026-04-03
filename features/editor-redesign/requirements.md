# Standalone Level Editor — Requirements

## Overview

Replace the in-game editor overlay (EditorScene launched via E key) with a standalone HTML application at `/editor/`. The editor runs as a Vite multi-page app with a split layout: Phaser canvas on the left rendering the level, native HTML/CSS controls on the right for all editing tools. After the standalone editor is complete, the old overlay editor (~26 state files) is deleted.

## Decisions Summary

| Decision | Answer |
|----------|--------|
| Scene architecture | Reuse GameScene with `isEditorMode` flag, disable gameplay |
| Editor state ownership | Shared in EditorBridge singleton, both sides read/write |
| Level data ownership | Phaser scene via Grid + EntityManager; HTML sends commands through bridge |
| UI framework | Vanilla HTML/CSS/JS, zero new dependencies |
| Migration strategy | Big bang — build standalone separately, delete old editor when done |
| Feature parity | v1 is strict parity with current editor; improvements deferred |
| Undo/redo | Design mutation architecture now (snapshot stack), implement UI later |
| Entity representation | Real entity instances, paused — reuse extractEntities()/getCurrentLevelData() |
| Asset loading | Load ALL game assets upfront |
| Production builds | Editor completely excluded from production bundle |

---

## R1: Vite Multi-Page App Entry Point

**Purpose**: Serve the editor at `/editor/` as a separate HTML page during development only.

**Behavior**:
- `editor/index.html` is a second Vite entry point
- Contains a two-column layout: left div for Phaser canvas, right div for HTML panel
- Phaser `parent` config targets the left div
- Editor JS entry point (`editor/main.ts`) boots Phaser with GameScene in editor mode and initializes the HTML panel
- Editor is excluded from production builds entirely (not in `build.rollupOptions.input`)

**Acceptance Criteria**:
- `npm run dev` serves game at `/` and editor at `/editor/`
- `npm run build` produces only the game bundle, no editor code
- Editor page loads Phaser canvas in left panel, HTML controls in right panel
- Game at `/` is completely unaffected by editor code

---

## R2: Layout

**Purpose**: Split-screen layout with Phaser canvas left, HTML controls right.

**Behavior**:
- Fixed 70/30 ratio (left/right), not resizable in v1
- Phaser canvas renders at 1280×720 using Phaser's `FIT` scale mode, scaled to fit the left panel
- Right panel is a scrollable HTML container
- Full viewport height, no outer scrollbar

**Acceptance Criteria**:
- Canvas fills left 70% of viewport, maintaining aspect ratio
- Right panel fills remaining 30%, scrolls vertically if content overflows
- Layout works at common screen sizes (1920×1080, 1440×900, 1280×720)

---

## R3: GameScene in Editor Mode

**Purpose**: Reuse GameScene with gameplay disabled for rendering.

**Behavior**:
- GameScene receives an `editorMode: true` flag via scene data
- When `editorMode` is true:
  - EntityManager does NOT call `update()` on entities (entities are paused)
  - StateMachine does NOT run (no InGameState)
  - CollisionSystem does NOT run
  - No player input processing (InputComponent disabled)
  - HudScene is NOT launched
  - PetManager is NOT initialized
  - No ammo refill, no health regen, no timers
- When `editorMode` is true, the following STILL work:
  - Grid rendering (including debug visualization)
  - Theme rendering (GameSceneRenderer: floor, walls, vignette, background textures)
  - Entity sprites render at their positions (SpriteComponent syncs to TransformComponent)
  - Camera panning (controlled by EditorBridge, not player input)
  - Mouse wheel zoom on canvas
- All assets loaded upfront in a preload phase (all ASSET_GROUPS + all background textures)
- EntityLoader runs with `isEditorMode: true` (existing flag — spawns all entities immediately, no event-based creation)

**Acceptance Criteria**:
- Level renders identically to the game (same theme, textures, entities)
- No gameplay runs (no AI, no movement, no combat, no HUD)
- Entities visible at their spawn positions as paused sprites
- Grid debug overlay toggleable
- Camera can pan freely (WASD when mouse over canvas)
- Mouse wheel zooms in/out

---

## R4: EditorBridge Singleton

**Purpose**: Shared state and communication layer between HTML panel and Phaser scene.

**State Owned by Bridge**:
- `currentTool`: string — active editing tool (e.g., `'select'`, `'wall'`, `'water'`, `'platform'`, `'stairs'`, `'bridge'`, `'blocked'`, `'floor'`, `'texture'`, `'entity'`)
- `selectedCellProperty`: CellProperty | null — which property the grid paint tool applies
- `selectedEntityType`: EntityType | null — which entity type to place
- `selectedEntity`: Entity | null — currently selected entity on canvas
- `selectedCell`: {col, row} | null — currently selected cell
- `selectedTexture`: string | null — texture key for texture painting
- `isDirty`: boolean — unsaved changes exist
- `currentLevelName`: string | null — name of loaded level

**Methods (HTML → Phaser)**:
- `setTool(tool: string)`: Change active tool
- `paintCell(col, row)`: Apply current tool to cell (set property, set texture, etc.)
- `clearCell(col, row)`: Remove properties/texture from cell
- `setCellLayer(col, row, layer)`: Set cell layer
- `setCellTexture(col, row, textureKey)`: Set background texture on cell
- `addEntity(type, col, row, data)`: Create entity at position
- `removeEntity(entityId)`: Delete entity
- `updateEntity(entityId, data)`: Modify entity properties
- `moveEntity(entityId, col, row)`: Move entity to new position
- `movePlayer(col, row)`: Move player start position
- `setTheme(theme)`: Change level theme
- `resizeGrid(width, height, direction)`: Add/remove rows/columns
- `saveLevel()`: POST to `/api/save-level`
- `loadLevel(levelName)`: Restart scene with new level
- `newLevel(width, height, theme)`: Create blank level
- `getLevelData()`: Returns current level JSON (calls getCurrentLevelData())
- `getGrid()`: Returns Grid reference for reading cell data
- `getEntityManager()`: Returns EntityManager reference for reading entities
- `undo()`: Pop history stack, reload level state (v2)
- `redo()`: Push forward in history stack (v2)

**Methods (Phaser → HTML callbacks)**:
- `onCellClicked(col, row, cellData)`: User clicked a cell on canvas
- `onEntityClicked(entity)`: User clicked an entity on canvas
- `onSelectionCleared()`: User clicked empty space
- `onLevelLoaded(levelName, levelData)`: Level finished loading
- `onDirtyStateChanged(isDirty)`: Unsaved changes state changed

**Communication Pattern**: Direct method calls. Bridge holds references to both the Phaser scene and the HTML panel controller. No event bus needed.

**Acceptance Criteria**:
- HTML panel can read all editor state from bridge
- HTML panel can invoke all edit operations through bridge
- Phaser scene notifies HTML panel of canvas interactions via callbacks
- State is consistent — both sides see the same selected tool, entity, etc.

---

## R5: Undo/Redo Architecture (v1 Architecture, v2 Implementation)

**Purpose**: All mutations route through a single point that supports future undo/redo.

**Behavior**:
- Every mutation method on EditorBridge (paintCell, addEntity, removeEntity, updateEntity, moveEntity, setCellTexture, setTheme, resizeGrid, etc.) calls a private `_applyMutation(description, mutationFn)` wrapper
- Before applying the mutation, `_applyMutation` snapshots the current level state via `getCurrentLevelData()` and pushes it onto a history stack (array of serialized LevelData JSON strings)
- The mutation function then executes
- `isDirty` is set to true
- History stack has a max size (e.g., 50 entries) — oldest entries dropped when exceeded
- `undo()` pops the stack, deserializes the previous state, and reloads the scene with that data
- `redo()` uses a separate forward stack (cleared on any new mutation)
- v1: `_applyMutation` wrapper exists and snapshots, but `undo()`/`redo()` methods are stubs that log "not yet implemented"
- v2: Wire up Ctrl+Z / Ctrl+Y and UI buttons

**Acceptance Criteria**:
- All edit operations go through `_applyMutation`
- History stack accumulates snapshots
- No undo/redo UI or keybindings in v1
- Architecture supports adding undo/redo without refactoring mutation code

---

## R6: HTML Panel — Toolbar

**Purpose**: Always-visible toolbar at top of right panel for mode/tool selection.

**Toolbar Contents**:
- Level selector dropdown (populated from `/api/levels`)
- New Level button
- Save button (Ctrl+S shortcut)
- Play button (opens game in new tab at current level)
- Unsaved changes indicator (dot or asterisk next to level name)

**Below Toolbar — Tool Buttons**:
- Grid tools: Wall, Floor, Water, Platform, Stairs, Bridge, Blocked
- Entity tools: Add Entity button (opens entity type picker)
- Texture tool: Opens texture browser
- Select tool: Click entities/cells to inspect/edit
- Move tool: Click entity then click destination
- Theme selector dropdown

**Acceptance Criteria**:
- Toolbar always visible at top of right panel
- Tool buttons highlight when active
- Level dropdown lists all available levels
- Save button POSTs to `/api/save-level`, shows success/error toast
- Play button opens `/?level=<currentLevel>` in new tab
- Unsaved indicator visible when `isDirty` is true

---

## R7: HTML Panel — Context Panel

**Purpose**: Context-sensitive panel below toolbar, shows details based on current selection.

**When nothing selected**: Shows level info (dimensions, theme, entity count, player start position).

**When cell selected**: Shows cell properties (layer, properties checkboxes, background texture, animated texture). Editable — changes apply through bridge.

**When entity selected**: Shows entity properties form. Contents vary by entity type:

| Entity Type | Editable Properties |
|-------------|-------------------|
| All entities | id (read-only), type (read-only), position (col/row), createOnAnyEvent, createOnAllEvents, suppressOnAnyFlag, respawnable |
| skeleton, thrower, bug_base, bullet_dude, puma | difficulty (easy/medium/hard) |
| puma | startDirection |
| stalking_robot | difficulty, waypoints list (shown in HTML, placed on canvas) |
| npc | assets, direction, interactions (nested form with flag conditions, position overrides, priority ordering) |
| breakable | texture, health, rarity |
| trigger | eventToRaise, triggerCells (shown in HTML, painted on canvas), oneShot |
| exit | eventName, targetLevel, targetCol, targetRow |
| eventchainer | eventsToRaise list |
| cellmodifier | all cellmodifier-specific data |
| interaction | filename |

**Acceptance Criteria**:
- Panel updates when selection changes
- All properties listed above are editable via HTML form controls
- Changes apply immediately through EditorBridge
- Waypoint placement and trigger cell painting remain canvas-based (click to place) with list shown in HTML
- NPC interaction editor is a proper nested HTML form (not Phaser overlay)

---

## R8: HTML Panel — Texture Browser

**Purpose**: Browse and select background textures for painting onto cells.

**Behavior**:
- Scrollable grid of `<img>` thumbnails showing all available background textures
- Search/filter input at top — filters by texture key name
- Clicking a texture selects it as the active paint texture
- Selected texture highlighted
- Includes both regular textures and spritesheet sub-sprites (from SpritesheetTextures.ts)

**Acceptance Criteria**:
- All available textures shown as thumbnails
- Search filters in real-time as user types
- Selected texture used when painting cells on canvas
- Thumbnails load from actual game asset images

---

## R9: HTML Panel — Entity Palette

**Purpose**: Select entity type to place on the canvas.

**Behavior**:
- List or grid of all placeable entity types: skeleton, thrower, bug_base, bullet_dude, puma, stalking_robot, npc, breakable, trigger, exit, eventchainer, cellmodifier, interaction
- Clicking an entity type activates placement mode
- Next click on canvas places entity at that cell
- Default data values used (medium difficulty, etc.)
- After placement, entity appears on canvas and is auto-selected in context panel

**Acceptance Criteria**:
- All entity types listed
- Click type → click canvas → entity placed
- Entity immediately visible and selectable
- Default values match current AddEntityEditorState defaults

---

## R10: Canvas Interaction

**Purpose**: Handle mouse/touch input on the Phaser canvas.

**Behavior depends on active tool**:

| Tool | Click Behavior | Drag Behavior |
|------|---------------|---------------|
| Select | Click entity → select it, click cell → select cell, click empty → deselect | N/A |
| Grid tools (wall, water, etc.) | Set property on cell | Paint property on drag |
| Floor | Remove all properties from cell | Paint floor on drag |
| Texture | Set selected texture on cell | Paint texture on drag |
| Entity placement | Place entity at clicked cell | N/A |
| Move | Click entity to pick up, click cell to place | N/A |

**Camera Controls**:
- WASD pans camera (only when mouse is over canvas, NOT when HTML input focused)
- Mouse wheel zooms in/out
- Keyboard shortcuts (G, Ctrl+S, etc.) only active when no HTML input is focused

**Acceptance Criteria**:
- Click/drag behavior matches active tool
- WASD only pans when mouse is over canvas
- Typing in HTML inputs never triggers WASD panning
- Zoom works via mouse wheel
- Keyboard shortcuts don't fire when typing in HTML inputs

---

## R11: Level Management

**Purpose**: Load, create, and switch between levels.

### R11.1: Level List API

**Endpoint**: `GET /api/levels`

**Response**: JSON array of `{ filename: string, width: number, height: number, theme: string }` for each `.json` file in `public/levels/`.

**Implementation**: Vite dev server plugin (same pattern as save-level).

### R11.2: Level Switching

**Behavior**:
- Dropdown in toolbar lists all levels from `/api/levels`
- Selecting a level triggers full Phaser scene restart with new level data
- If unsaved changes exist, show browser `confirm()` dialog before switching
- After load, EditorBridge fires `onLevelLoaded` callback to update HTML panel

**Acceptance Criteria**:
- All levels listed in dropdown
- Switching loads new level correctly
- Unsaved changes warning shown
- HTML panel updates after level load

### R11.3: New Level Creation

**Behavior**:
- "New Level" button opens a small HTML form: name, width, height, theme dropdown
- Creates a minimal LevelData object (empty cells, player at 0,0, selected theme)
- Saves to disk via `/api/save-level`
- Loads the new level in the editor

**Acceptance Criteria**:
- Form validates inputs (name required, width/height > 0)
- New level file created on disk
- Editor loads the new level
- New level appears in level dropdown

---

## R12: Save System

**Purpose**: Save current level data to disk.

**Behavior**:
- Save button (and Ctrl+S shortcut) calls `EditorBridge.saveLevel()`
- `saveLevel()` calls `getCurrentLevelData()` to serialize, then POSTs to `/api/save-level`
- On success: show green toast "Saved {levelName}", set `isDirty = false`
- On failure: show red toast "Save failed: {error}"
- Toast auto-dismisses after 3 seconds

**Acceptance Criteria**:
- Save writes correct JSON to `public/levels/{name}.json`
- Toast shows success or failure
- `isDirty` cleared on successful save
- Ctrl+S works when canvas is focused (not when typing in HTML input)

---

## R13: Unsaved Changes Warning

**Purpose**: Prevent accidental data loss.

**Behavior**:
- Track `isDirty` flag in EditorBridge (set true on any mutation, false on save)
- Before switching levels: `confirm("You have unsaved changes. Continue?")`
- Before closing tab: `window.onbeforeunload` returns warning string
- Unsaved indicator (asterisk or dot) shown next to level name in toolbar

**Acceptance Criteria**:
- Warning shown before level switch if dirty
- Warning shown before tab close if dirty
- Visual indicator in toolbar when dirty
- Indicator clears after save

---

## R14: Playtest Button

**Purpose**: Quick-launch game at current level for testing.

**Behavior**:
- "Play" button in toolbar
- Opens `/?level={currentLevelName}` in a new browser tab
- If unsaved changes, prompts to save first

**Acceptance Criteria**:
- Opens game in new tab at correct level
- Prompts to save if dirty

---

## R15: Grid Resize

**Purpose**: Add/remove rows and columns.

**Behavior**:
- Resize controls in context panel (when no entity selected) or in toolbar
- Buttons: Add Row (bottom), Add Column (right), Remove Row (bottom), Remove Column (right)
- Grid re-renders after resize
- Camera bounds update

**Acceptance Criteria**:
- Grid dimensions change correctly
- Entities outside new bounds are warned about (not silently deleted)
- Grid re-renders
- Minimum size enforced (10×10)

---

## R16: Theme Switching

**Purpose**: Change level visual theme.

**Behavior**:
- Theme dropdown in toolbar: dungeon, swamp, grass, wilds
- Changing theme calls `EditorBridge.setTheme()` which updates `levelData.levelTheme` and re-renders via GameSceneRenderer

**Acceptance Criteria**:
- Theme changes immediately visible on canvas
- Floor, wall, platform textures update to match theme
- Vignette and background update

---

## R17: Keyboard Shortcut System

**Purpose**: Power-user shortcuts that don't conflict with HTML inputs.

**Behavior**:
- Shortcuts only active when: mouse is over canvas AND no HTML input/textarea/select is focused
- Ctrl+S: Save (always active, even when HTML focused)
- G: Toggle grid debug overlay
- Delete/Backspace: Delete selected entity
- Escape: Deselect / cancel current operation

**Acceptance Criteria**:
- Shortcuts work when canvas has focus
- Shortcuts do NOT fire when typing in HTML inputs (except Ctrl+S)
- WASD panning only when mouse over canvas

---

## R18: Editor Labels and Overlays

**Purpose**: Visual indicators on canvas for editor-only information.

**Behavior** (same as current editor):
- Entity type labels (T, S, BB, P, NPC, E) rendered above entities
- Trigger cells highlighted with yellow overlay
- Exit cells highlighted
- Selected entity/cell highlighted with distinct color
- Cell hover shows col/row coordinates

**Acceptance Criteria**:
- Labels visible for all entity types
- Trigger/exit cells highlighted
- Selection clearly indicated
- Hover coordinates shown

---

## R19: Old Editor Removal

**Purpose**: Clean up old editor code after standalone editor is complete.

**Files to Delete** (after standalone editor is verified working):
- All files in `src/editor/` (~26 files)
- `src/scenes/EditorScene.ts`
- E-key handler in GameScene.ts
- `isEditorMode` flag and related branches in GameScene.ts
- `isEditorMode` parameter in EntityLoader.ts

**Acceptance Criteria**:
- All old editor code removed
- Game at `/` works without editor code
- Build size reduced
- No dead code references

---

## Non-Requirements (Explicitly Deferred)

- Undo/redo UI and keybindings (v2 — architecture only in v1)
- Level validation before save
- Resizable panel split
- Multi-select entities
- Copy/paste entities
- Drag-and-drop entity reordering
- Asset hot-reload
- Multiple tabs for multiple levels
- Large level optimizations (virtual scrolling, LOD)
- Multiple browser tab coordination

---

## Files to Create

**Editor Entry Point**:
- `editor/index.html` — Editor HTML page
- `editor/main.ts` — Editor JS entry point (boots Phaser + HTML panel)
- `editor/editor.css` — Editor stylesheet

**EditorBridge**:
- `editor/EditorBridge.ts` — Shared state + communication singleton

**HTML Panel**:
- `editor/panels/Toolbar.ts` — Top toolbar (level selector, save, play, tools)
- `editor/panels/ContextPanel.ts` — Context-sensitive properties panel
- `editor/panels/TextureBrowser.ts` — Texture grid with search
- `editor/panels/EntityPalette.ts` — Entity type picker
- `editor/panels/EntityForm.ts` — Entity property editing forms
- `editor/panels/CellForm.ts` — Cell property editing
- `editor/panels/LevelInfo.ts` — Level metadata display
- `editor/panels/Toast.ts` — Toast notification system

**Vite Plugin**:
- Extend `vite.config.ts` with `/api/levels` endpoint and multi-page config

## Files to Modify

- `vite.config.ts` — Add multi-page config, `/api/levels` endpoint, exclude editor from prod build
- `src/scenes/GameScene.ts` — Accept `editorMode` from scene data, skip gameplay systems when true
- `src/systems/EntityLoader.ts` — Already has `isEditorMode` parameter (no change needed)

## Files to Delete (After Completion)

- `src/editor/*.ts` (~26 files)
- `src/scenes/EditorScene.ts`
- E-key handler block in `src/scenes/GameScene.ts`

---

## Success Criteria

- All current editor functionality works in standalone editor
- No new dependencies added (vanilla HTML/CSS/JS)
- Game at `/` completely unaffected
- Editor excluded from production builds
- WASD/keyboard conflict resolved (mouse-over-canvas gating)
- NPC interaction editing is a proper HTML form
- Texture browser has search/filter
- Level switching works without page reload
- Unsaved changes warning prevents data loss
- Mutation architecture supports future undo/redo
- Old editor code deleted after verification
- Build and lint pass with zero errors
