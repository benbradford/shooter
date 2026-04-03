# Standalone Level Editor — Task Breakdown

## Phase 1: Infrastructure (2.5 hours)

### Task 1.1: Vite Multi-Page Config + /api/levels Endpoint
**File**: `vite.config.ts`

**Subtasks**:
- [ ] Add `levelsApiPlugin()` — GET `/api/levels` returns JSON array of level files with metadata
- [ ] Ensure `build.rollupOptions.input` only includes `index.html` (editor excluded from prod)

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 1.2: Editor HTML Entry Point + CSS
**Files**: `editor/index.html`, `editor/editor.css`

**Subtasks**:
- [ ] Create `editor/index.html` with two-column layout (`#canvas-container` 70%, `#panel-container` 30%)
- [ ] Create `editor/editor.css` — flexbox layout, full viewport, scrollable right panel, dark theme

**Dependencies**: Task 1.1
**Estimated Time**: 20 minutes

---

### Task 1.3: Editor Main Entry Point
**File**: `editor/main.ts`

**Subtasks**:
- [ ] Boot Phaser with `parent: 'canvas-container'`, FIT scale mode, 1280×720
- [ ] On `game.events.once('ready')`: create bridge, panels, CanvasInteraction
- [ ] Wire `bridge.onSceneReady` to re-register Phaser listeners + camera update
- [ ] Wire `bridge.onLoadError` to toast
- [ ] Call `game.scene.start('game', { editorMode: true, levelName: 'grass_overworld1' })`
- [ ] Add `beforeunload` listener for unsaved changes

**Dependencies**: Tasks 1.2, 1.4, 1.5
**Estimated Time**: 30 minutes

---

### Task 1.4: EditorBridge Skeleton
**File**: `editor/EditorBridge.ts`

**Subtasks**:
- [ ] Singleton with `getInstance()`
- [ ] All state fields: `currentTool`, `selectedEntity`, `selectedCell`, `selectedTexture`, `isDirty`, `currentLevelName`, `isLoading`, `isSaving`, `isDragBatching`
- [ ] All callback slots: `onCellClicked`, `onEntityClicked`, `onSelectionCleared`, `onLevelLoaded`, `onDirtyStateChanged`, `onSceneReady`, `onLoadError`
- [ ] Scene accessors: `getScene()`, `setScene()`, `getGrid()`, `getEntityManager()`
- [ ] `notifySceneReady()` — clears `isLoading`, fires callbacks
- [ ] `_applyMutation()` wrapper with snapshot history stack (max 50)
- [ ] `beginDragMutation()` / `endDragMutation()` for paint batching
- [ ] `undo()` / `redo()` stubs (v1: console.log)
- [ ] `setTool()`, `selectEntity()`, `selectCell()`, `clearSelection()`
- [ ] `getCurrentLevelData()`, `extractGridCells()`, `extractEntities()` — lifted from EditorScene.ts

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 1.5: Toast Notification Panel
**File**: `editor/panels/Toast.ts`

**Subtasks**:
- [ ] `show(message, type)` — creates toast div, auto-removes after 3s
- [ ] CSS classes for success (green) and error (red)

**Dependencies**: None
**Estimated Time**: 10 minutes

---

### Task 1.6: PanelController Skeleton
**File**: `editor/panels/PanelController.ts`

**Subtasks**:
- [ ] Creates all panel instances (toolbar, contextPanel, textureBrowser, entityPalette, toast)
- [ ] Wires bridge callbacks to panel update methods
- [ ] Exposes `toast` for error reporting

**Dependencies**: Task 1.4, Task 1.5
**Estimated Time**: 20 minutes

---

## Phase 2: GameScene Editor Mode (1.5 hours)

### Task 2.1: Add Editor Mode to GameScene
**File**: `src/scenes/GameScene.ts`

**Subtasks**:
- [ ] Accept `editorMode` and `levelName` from scene data
- [ ] When `editorMode: true`:
  - [ ] Skip StateMachine, CollisionSystem, HudScene, PetManager, player input, WorldState, timers
  - [ ] Load level by name, load ALL assets upfront
  - [ ] Initialize grid + GameSceneRenderer (theme rendering)
  - [ ] Spawn entities with `isEditorMode: true` (all immediately, paused)
  - [ ] Free camera: bounds (-10000, -10000, 20000, 20000), zoom 1.0
- [ ] Wrap entire editor init in try/catch; fallback to empty 10×10 grid on error
- [ ] ALWAYS call `bridge.setScene(this)` + `bridge.notifySceneReady()` after try/catch
- [ ] In `update()`: return early if `isEditorMode` (no gameplay updates)
- [ ] Expose accessors: `getGrid()`, `getEntityManager()`, `getLevelData()`, `getEntityLoader()`, `renderGrid()`, `setTheme()`

**Dependencies**: Task 1.4
**Estimated Time**: 1.5 hours

---

## Phase 3: Canvas Interaction (1.5 hours)

### Task 3.1: CanvasInteraction Handler
**File**: `editor/CanvasInteraction.ts`

**Subtasks**:
- [ ] Constructor: DOM listeners only (mouseenter/leave, keydown/keyup, wheel, window blur)
- [ ] `registerPhaserListeners()` — called from `onSceneReady`, registers pointerdown/move/up on scene
- [ ] WASD gating: only when `isMouseOverCanvas && !isHtmlInputFocused()`
- [ ] `updateCamera(delta)` — WASD panning at 400px/sec
- [ ] Mouse wheel zoom (0.25–3.0)
- [ ] Keyboard shortcuts: Ctrl+S (always), G/Delete/Escape (gated)
- [ ] `onPointerDown` — route by `bridge.currentTool` (select, grid tools, texture, entity, move)
- [ ] `onPointerMove` — drag painting with cell deduplication
- [ ] `onPointerUp` — end drag, call `endDragMutation()`
- [ ] Orphaned drag recovery: safety reset in `onPointerDown`, `window.blur` cleanup
- [ ] `handleSelect()` — entity hit detection via sprite bounds, fallback to cell selection

**Dependencies**: Task 1.4
**Estimated Time**: 1.5 hours

---

## Phase 4: HTML Panels — Core (3 hours)

### Task 4.1: Toolbar Panel
**File**: `editor/panels/Toolbar.ts`

**Subtasks**:
- [ ] Level selector dropdown (populated from `/api/levels` on load + after `onLevelLoaded`)
- [ ] Save button → `bridge.saveLevel()`
- [ ] Play button → opens `/?level={name}` in new tab (prompt save if dirty)
- [ ] New Level button → small inline form (name, width, height, theme) → `bridge.newLevel()`
- [ ] Unsaved changes indicator (asterisk next to level name)
- [ ] Tool buttons: Select, Wall, Floor, Water, Platform, Stairs, Bridge, Blocked, Texture, Entity, Move
- [ ] Active tool highlighting
- [ ] Theme selector dropdown → `bridge.setTheme()`

**Dependencies**: Tasks 1.4, 1.6
**Estimated Time**: 1.5 hours

---

### Task 4.2: ContextPanel + LevelInfo
**Files**: `editor/panels/ContextPanel.ts`, `editor/panels/LevelInfo.ts`

**Subtasks**:
- [ ] ContextPanel: `showLevelInfo()`, `showCellForm()`, `showEntityForm()` — clears and swaps content
- [ ] LevelInfo: shows dimensions, theme, entity count, player start position (read-only)

**Dependencies**: Task 1.4
**Estimated Time**: 30 minutes

---

### Task 4.3: EditorBridge Mutation Methods — Save + Load
**File**: `editor/EditorBridge.ts` (extend)

**Subtasks**:
- [ ] `saveLevel()` — POST to `/api/save-level`, toast feedback, `isSaving` guard, stale-save check
- [ ] `loadLevel(levelName)` — `isLoading` guard, dirty confirm, scene restart
- [ ] `newLevel(name, width, height, theme)` — save empty level to disk, then loadLevel

**Dependencies**: Task 1.4
**Estimated Time**: 1 hour

---

## Phase 5: Grid Editing (2 hours)

### Task 5.1: EditorBridge Grid Mutation Methods
**File**: `editor/EditorBridge.ts` (extend)

**Subtasks**:
- [ ] `paintCell(col, row)` — apply `selectedCellProperty` or clear (floor tool)
- [ ] `setCellTexture(col, row, textureKey)` — set background texture
- [ ] `setCellLayer(col, row, layer)` — set cell layer
- [ ] `clearCell(col, row)` — remove all properties and texture
- [ ] All route through `_applyMutation`

**Dependencies**: Task 1.4
**Estimated Time**: 30 minutes

---

### Task 5.2: CellForm Panel
**File**: `editor/panels/CellForm.ts`

**Subtasks**:
- [ ] Layer number input → `bridge.setCellLayer()`
- [ ] Property checkboxes (wall, water, platform, stairs, bridge, blocked) → `bridge.paintCell()`
- [ ] Background texture display (read-only, shows current texture key)
- [ ] Clear cell button → `bridge.clearCell()`

**Dependencies**: Tasks 4.2, 5.1
**Estimated Time**: 30 minutes

---

### Task 5.3: TextureBrowser Panel
**File**: `editor/panels/TextureBrowser.ts`

**Subtasks**:
- [ ] Search input with real-time filtering
- [ ] Scrollable grid of `<img>` thumbnails (extract from Phaser textures via canvas)
- [ ] Include spritesheet sub-sprites from SpritesheetTextures.ts
- [ ] Click thumbnail → `bridge.setTool('texture')` + `bridge.selectedTexture = key`
- [ ] Selected texture highlighted
- [ ] `populateFromScene()` called after `onSceneReady`

**Dependencies**: Task 1.4
**Estimated Time**: 1 hour

---

## Phase 6: Entity System (3 hours)

### Task 6.1: EditorBridge Entity Mutation Methods
**File**: `editor/EditorBridge.ts` (extend)

**Subtasks**:
- [ ] `addEntity(type, col, row, data)` — in-place creation via EntityLoader factory, auto-ID, update levelData
- [ ] `removeEntity(entityId)` — destroy entity, remove from levelData
- [ ] `moveEntity(entityId, col, row)` — update transform position
- [ ] `updateEntity(entityId, data)` — update entity component data
- [ ] `movePlayer(col, row)` — move player transform
- [ ] `deleteSelected()` — remove currently selected entity
- [ ] All route through `_applyMutation`

**Dependencies**: Task 1.4
**Estimated Time**: 1 hour

---

### Task 6.2: EntityPalette Panel
**File**: `editor/panels/EntityPalette.ts`

**Subtasks**:
- [ ] List all placeable types: skeleton, thrower, bug_base, bullet_dude, puma, stalking_robot, npc, breakable, trigger, exit, eventchainer, cellmodifier, interaction
- [ ] Click type → `bridge.setTool('entity')` + `bridge.selectedEntityType = type`
- [ ] Selected type highlighted

**Dependencies**: Task 1.4
**Estimated Time**: 20 minutes

---

### Task 6.3: EntityForm Panel — Common Fields
**File**: `editor/panels/EntityForm.ts`

**Subtasks**:
- [ ] Read-only: id, type
- [ ] Position: col/row inputs → `bridge.moveEntity()`
- [ ] Event fields: createOnAnyEvent, createOnAllEvents (comma-separated text inputs)
- [ ] suppressOnAnyFlag (JSON textarea)
- [ ] respawnable checkbox
- [ ] Delete button → `bridge.removeEntity()`

**Dependencies**: Tasks 4.2, 6.1
**Estimated Time**: 45 minutes

---

### Task 6.4: EntityForm — Type-Specific Fields
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] Difficulty dropdown (skeleton, thrower, bug_base, bullet_dude, puma)
- [ ] startDirection dropdown (puma)
- [ ] Waypoints list display (stalking_robot) — read-only list, canvas-based placement
- [ ] Breakable fields: texture input, health number, rarity dropdown
- [ ] Interaction entity: filename input

**Dependencies**: Task 6.3
**Estimated Time**: 55 minutes

---

## Phase 7: Complex Editors (4 hours)

### Task 7.1: Trigger Editor
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] eventToRaise text input
- [ ] oneShot checkbox
- [ ] triggerCells list display (col/row pairs)
- [ ] "Paint Trigger Cells" button → activates canvas mode for clicking cells to add/remove from list
- [ ] Bridge method to update trigger cell list

**Dependencies**: Task 6.3
**Estimated Time**: 45 minutes

---

### Task 7.2: Exit Editor
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] targetLevel dropdown (from `/api/levels`)
- [ ] targetCol, targetRow number inputs
- [ ] triggerCells list (same pattern as trigger)

**Dependencies**: Task 6.3
**Estimated Time**: 30 minutes

---

### Task 7.3: EventChainer Editor
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] eventsToRaise list — add/remove event name inputs
- [ ] Dynamic list with + / − buttons

**Dependencies**: Task 6.3
**Estimated Time**: 30 minutes

---

### Task 7.4: CellModifier Editor
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] All cellmodifier-specific fields as form inputs
- [ ] Changes apply through `bridge.updateEntity()`

**Dependencies**: Task 6.3
**Estimated Time**: 30 minutes

---

### Task 7.5: NPC Interaction Editor
**File**: `editor/panels/EntityForm.ts` (extend)

**Subtasks**:
- [ ] NPC fields: assets input, direction dropdown
- [ ] Interactions list — ordered, add/remove
- [ ] Per interaction: name input, whenFlagSet (name/condition/value), position override (col/row)
- [ ] Condition dropdown: equals, not_equals, greater_than, less_than, gte, lte
- [ ] Reorder interactions (move up/down buttons)

**Dependencies**: Task 6.3
**Estimated Time**: 1.5 hours

---

### Task 7.6: Waypoint Placement (stalking_robot)
**File**: `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] When robot selected + waypoint mode active, clicks add waypoints
- [ ] Waypoints shown as markers on canvas
- [ ] Bridge method to update waypoint list

**Dependencies**: Tasks 3.1, 6.3
**Estimated Time**: 15 minutes

---

## Phase 8: Level Management (1.5 hours)

### Task 8.1: Level Switching
**File**: `editor/panels/Toolbar.ts` (extend)

**Subtasks**:
- [ ] Level dropdown `change` event → `bridge.loadLevel(selectedValue)`
- [ ] Refresh dropdown after `onLevelLoaded` (re-fetch `/api/levels`)
- [ ] Update dropdown selection to match current level

**Dependencies**: Tasks 4.1, 4.3
**Estimated Time**: 20 minutes

---

### Task 8.2: New Level Creation
**File**: `editor/panels/Toolbar.ts` (extend)

**Subtasks**:
- [ ] "New Level" button shows inline form (name, width, height, theme)
- [ ] Validate: name required, width/height > 0
- [ ] Submit → `bridge.newLevel()` → loads new level
- [ ] Cancel hides form

**Dependencies**: Tasks 4.1, 4.3
**Estimated Time**: 30 minutes

---

### Task 8.3: Grid Resize
**File**: `editor/EditorBridge.ts` (extend) + `editor/panels/LevelInfo.ts` (extend)

**Subtasks**:
- [ ] `resizeGrid(width, height)` — check out-of-bounds entities, confirm, resize, re-render
- [ ] Add Row / Add Column / Remove Row / Remove Column buttons in LevelInfo panel
- [ ] Minimum size 10×10 enforced

**Dependencies**: Tasks 4.2, 5.1
**Estimated Time**: 40 minutes

---

## Phase 9: Polish (2.5 hours)

### Task 9.1: Editor Labels and Overlays
**File**: `editor/EditorBridge.ts` or `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] Entity type labels rendered above entities (T, S, BB, P, NPC, E, etc.)
- [ ] Trigger cells highlighted with yellow overlay
- [ ] Exit cells highlighted
- [ ] Selected entity/cell highlighted with distinct color
- [ ] Render overlays after scene ready and on selection change

**Dependencies**: Task 2.1
**Estimated Time**: 1 hour

---

### Task 9.2: Playtest Button
**File**: `editor/panels/Toolbar.ts` (extend)

**Subtasks**:
- [ ] Play button opens `/?level={currentLevelName}` in new tab
- [ ] If dirty, prompt to save first

**Dependencies**: Task 4.1
**Estimated Time**: 10 minutes

---

### Task 9.3: Keyboard Shortcut Refinements
**File**: `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] Verify all shortcuts gated correctly (Ctrl+S always, others gated)
- [ ] Add any missing shortcuts from current editor
- [ ] Test WASD doesn't fire when typing in HTML inputs

**Dependencies**: Task 3.1
**Estimated Time**: 20 minutes

---

### Task 9.4: Cell Hover Coordinates
**File**: `editor/CanvasInteraction.ts` (extend)

**Subtasks**:
- [ ] On pointer move over canvas, show col/row coordinates (Phaser text or HTML overlay)
- [ ] Update on mouse move, hide when mouse leaves canvas

**Dependencies**: Task 3.1
**Estimated Time**: 20 minutes

---

### Task 9.5: Theme Switching Integration
**File**: `editor/EditorBridge.ts` (extend)

**Subtasks**:
- [ ] `setTheme(theme)` — update levelData, re-render via GameSceneRenderer
- [ ] Verify floor/wall/platform/vignette/background all update

**Dependencies**: Task 2.1
**Estimated Time**: 40 minutes

---

## Phase 10: Cleanup (1.5 hours)

### Task 10.1: Verify Feature Parity
**Subtasks**:
- [ ] Compare every old editor state file against standalone editor functionality
- [ ] Checklist: grid editing, texture painting, entity add/edit/move/delete, triggers, exits, eventchainers, cellmodifiers, NPC interactions, theme switching, resize, save/load
- [ ] Fix any gaps found

**Dependencies**: All previous phases
**Estimated Time**: 1 hour

---

### Task 10.2: Delete Old Editor Files
**Files**: `src/editor/*.ts` (~26 files), `src/scenes/EditorScene.ts`

**Subtasks**:
- [ ] Delete all files in `src/editor/`
- [ ] Delete `src/scenes/EditorScene.ts`
- [ ] Remove E-key handler block in `src/scenes/GameScene.ts`
- [ ] Remove old `isEditorMode` branches in GameScene that were for the overlay editor
- [ ] Remove EditorScene from scene registration in `src/main.ts`
- [ ] Run `npm run build` — must pass with zero errors
- [ ] Run `npx eslint src --ext .ts` — must pass with zero errors

**Dependencies**: Task 10.1
**Estimated Time**: 30 minutes

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Infrastructure | 2.5 hours |
| Phase 2: GameScene Editor Mode | 1.5 hours |
| Phase 3: Canvas Interaction | 1.5 hours |
| Phase 4: HTML Panels — Core | 3 hours |
| Phase 5: Grid Editing | 2 hours |
| Phase 6: Entity System | 3 hours |
| Phase 7: Complex Editors | 4 hours |
| Phase 8: Level Management | 1.5 hours |
| Phase 9: Polish | 2.5 hours |
| Phase 10: Cleanup | 1.5 hours |
| **Total** | **23 hours** |

## Critical Path

```
Phase 1 (Infrastructure)
  ├─ Task 1.4 (EditorBridge) ──→ ALL subsequent phases
  ├─ Task 1.1 (Vite config) ──→ Task 1.2 (HTML) ──→ Task 1.3 (main.ts)
  └─ Task 1.5 (Toast) ──→ Task 1.6 (PanelController)

Phase 2 (GameScene) ──→ Phase 3 (Canvas) ──→ Phase 5 (Grid) ──→ Phase 6 (Entity) ──→ Phase 7 (Complex)

Phase 4 (Panels) can parallel with Phase 2+3

Phase 8 (Level Mgmt) requires Phase 4 + Phase 5

Phase 9 (Polish) requires Phase 1–8

Phase 10 (Cleanup) requires Phase 9
```

**Shortest path**: 1.4 → 2.1 → 3.1 → 5.1 → 6.1 → 7.5 → 10.1 → 10.2

## Risk Areas

1. **GameScene editor mode (Task 2.1)** — Most complex single task. Must disable gameplay without breaking rendering. Risk of missing a system that causes side effects.
2. **Entity in-place creation (Task 6.1)** — Using `EntityLoader.createEntityCreator()` outside normal flow. May need adjustments to EntityLoader API.
3. **NPC interaction editor (Task 7.5)** — Most complex UI. Nested forms with dynamic lists, flag conditions, position overrides. High effort.
4. **Texture thumbnail extraction (Task 5.3)** — Extracting images from Phaser textures to `<img>` elements requires canvas manipulation. May have cross-origin or timing issues.
5. **Serialization correctness (Task 1.4)** — `extractEntities()` and `extractGridCells()` lifted from EditorScene must produce identical JSON. Regression risk.
6. **Scene restart lifecycle (Tasks 2.1, 4.3)** — Bridge must survive scene restarts. Phaser listeners must re-register. `isLoading` guard must be airtight.
