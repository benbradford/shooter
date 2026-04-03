# Standalone Editor Redesign — Clarifying Questions

These questions must be answered before writing requirements or design docs. They are grouped by concern area.

---

## 1. Scope & Migration Strategy

### Q1.1: Incremental or Big Bang?
Should we build the standalone editor incrementally (one editor state at a time, keeping the old overlay working in parallel) or do a complete rewrite where the old editor is removed once the new one is ready?

**Why it matters:** Incremental lets you keep editing levels during development. Big bang is cleaner but blocks editor use until complete.

### Q1.2: Keep the Old Editor?
After the standalone editor is complete, should the in-game overlay editor (press E) be removed entirely, or kept as a quick-access fallback?

**Why it matters:** Affects whether we delete ~26 editor state files or maintain two editor codepaths.

### Q1.3: Feature Parity First or Improvements First?
Should the first version be strict feature parity with the current editor (same capabilities, just in HTML), or should we add new capabilities (undo/redo, multi-select, etc.) from the start?

**Why it matters:** Feature parity is faster and lower risk. Adding new features during migration increases scope significantly.

---

## 2. Layout & Canvas

### Q2.1: Split Ratio
What should the left/right panel split be? Fixed pixel widths (e.g., 900px canvas + 400px panel)? Percentage-based (e.g., 70/30)? Resizable with a drag handle?

**Why it matters:** Affects CSS layout approach and whether the Phaser canvas needs to handle dynamic resizing.

### Q2.2: Phaser Canvas Size
The game currently runs at 1280×720 with EXPAND scale mode. In the editor, should the Phaser canvas:
- A) Keep 1280×720 and scale to fit the left panel
- B) Resize to match the left panel's actual pixel dimensions
- C) Use a different resolution optimized for editing (e.g., show more of the level at once)

**Why it matters:** Option B gives pixel-perfect editing but requires Phaser resize handling. Option A is simpler but may waste space or look blurry.

### Q2.3: Zoom Controls
The current editor has no zoom — you pan with WASD at a fixed zoom level. Should the standalone editor support:
- A) Mouse wheel zoom in/out on the canvas
- B) Fixed zoom level (same as current)
- C) Zoom buttons in the UI panel

**Why it matters:** Zoom is very useful for large levels but adds complexity to coordinate mapping between screen and world space.

### Q2.4: Canvas Interaction Model
Currently the editor uses Phaser's input system for clicks on the canvas (pointerdown events). In the standalone editor, should canvas interactions still go through Phaser's input system, or should we use DOM events on the canvas element and translate coordinates ourselves?

**Why it matters:** Phaser input is simpler for world-space coordinate conversion. DOM events give more control and avoid Phaser input quirks.

---

## 3. Phaser Scene Architecture

### Q3.1: Reuse GameScene or New Scene?
The feature request mentions an "EditorGameScene" — a simplified scene that renders but doesn't run gameplay. Should this:
- A) Be a completely new scene class that only renders (no EntityManager, no StateMachine, no collision)
- B) Be GameScene with a flag to disable gameplay (similar to current `isEditorMode`)
- C) Reuse GameScene but strip out gameplay systems at construction time

**Why it matters:** Option A is cleanest but requires duplicating rendering setup. Option B is fastest but keeps gameplay code loaded. Option C is a middle ground.

### Q3.2: Entity Representation in Editor
Currently the editor runs the full GameScene with real entities (skeletons, robots, etc.) that are just paused. In the standalone editor, should entities be:
- A) Real entity instances (same as now, just paused) — allows reusing extractEntities() logic
- B) Lightweight editor-only representations (just sprites at positions with metadata) — simpler, no ECS overhead
- C) Real entities for rendering but with a stripped-down EntityManager

**Why it matters:** Real entities mean we can reuse the existing `extractEntities()` and `getCurrentLevelData()` logic. Lightweight representations are simpler but require rewriting serialization.

### Q3.3: Asset Loading
Currently the editor loads assets through GameScene's preload. In the standalone editor:
- A) Load ALL game assets upfront (simpler, but slower startup)
- B) Load assets per-level like the game does (faster startup, but need to handle level switching)
- C) Load a minimal set + lazy-load textures as needed

**Why it matters:** The editor needs access to all entity spritesheets for the "Add Entity" palette and all background textures for the texture browser. Loading everything upfront may be simplest.

---

## 4. HTML UI Design

### Q4.1: UI Framework
Should the HTML panel use:
- A) Vanilla HTML/CSS/JS (no dependencies, matches project style)
- B) A lightweight library like Preact or Lit (reactive updates, components)
- C) A full framework like React or Vue (powerful but heavy dependency)

**Why it matters:** The current project has zero frontend framework dependencies. Adding one is a big decision. Vanilla HTML works but the editor has complex UI (nested lists, forms, drag-and-drop).

### Q4.2: CSS Approach
Should the editor UI use:
- A) Plain CSS (inline styles or a single stylesheet)
- B) CSS modules or scoped styles
- C) A CSS framework like Tailwind

**Why it matters:** The current editor states already use inline styles on DOM elements. A consistent approach prevents style conflicts.

### Q4.3: Panel Layout — Tabs or Scrollable?
The right panel needs to show: level selector, tool palette, entity palette, properties panel, texture browser, trigger/exit/eventchainer/cellmodifier editors, theme selector, resize controls. Should these be:
- A) Tabbed interface (one section visible at a time)
- B) Accordion/collapsible sections (all visible, collapsed by default)
- C) Context-sensitive (show relevant panel based on what's selected on canvas)
- D) Combination (always-visible toolbar at top + context panel below)

**Why it matters:** There's a LOT of UI to fit. Tabs are clean but require switching. Context-sensitive is most intuitive but hardest to implement.

### Q4.4: Texture Browser Design
The current texture browser is a paginated 3-column grid of Phaser text buttons with tiny previews. In HTML, should it be:
- A) Scrollable grid of `<img>` thumbnails (load actual texture images)
- B) Categorized/filterable list with search
- C) Both (grid view + search/filter)

**Why it matters:** There are 44+ regular textures plus spritesheet sub-sprites. A flat grid gets unwieldy. Search/filter would be a big improvement.

### Q4.5: Properties Panel Depth
When editing an entity, how detailed should the properties panel be? Currently you can edit:
- Difficulty (easy/medium/hard)
- Position (via move mode)
- Waypoints (robot only, drag on canvas)
- Direction (NPC only)
- Interactions (NPC only, complex nested form)
- createOnAnyEvent / createOnAllEvents
- suppressOnAnyFlag
- respawnable

Should ALL of these be editable in the HTML panel, or should some remain canvas-based (e.g., waypoint dragging)?

**Why it matters:** Moving everything to HTML is cleaner but waypoint editing is inherently spatial — dragging on the canvas is more intuitive than typing coordinates.

---

## 5. EditorBridge Communication

### Q5.1: Communication Pattern
The feature request mentions an EditorBridge singleton. Should communication be:
- A) Direct method calls (bridge.selectCell(col, row) → Phaser scene responds)
- B) Event-based (bridge.emit('cellSelected', {col, row}) → listeners respond)
- C) Reactive state store (bridge holds state, both sides observe changes)

**Why it matters:** Direct calls are simplest. Events are more decoupled. Reactive state is most robust but most complex.

### Q5.2: State Ownership
Who owns the "editor state" (selected tool, selected entity, current mode)?
- A) The HTML panel owns state, Phaser scene is a dumb renderer
- B) The Phaser scene owns state (like current editor), HTML panel reflects it
- C) Shared state in EditorBridge, both sides read/write

**Why it matters:** This is the most important architectural decision. It determines data flow direction and where logic lives.

### Q5.3: Level Data Ownership
Who owns the level data being edited?
- A) The Phaser scene (via Grid + EntityManager, like current editor) — HTML reads from it
- B) The EditorBridge holds a plain JS object — both sides read/write it
- C) The HTML panel holds it — Phaser scene renders from it

**Why it matters:** Currently the editor mutates GameScene's Grid and EntityManager directly. If we want the HTML panel to be the source of truth, we need to rethink how edits flow.

---

## 6. Level Management

### Q6.1: Level Switching
The feature request says "switch between levels without reload." How should this work?
- A) Dropdown triggers full Phaser scene restart with new level data (like current game transitions)
- B) Dropdown loads new JSON, replaces Grid + entities in-place without scene restart
- C) Multiple levels open in tabs (like a code editor)

**Why it matters:** Option A is simplest but has a loading delay. Option B is smoother but requires careful cleanup. Option C is powerful but very complex.

### Q6.2: Level List API
The feature request mentions a `/api/levels` endpoint. Should this:
- A) Return a list of filenames from `public/levels/`
- B) Return filenames + metadata (dimensions, theme, entity count)
- C) Just scan the filesystem client-side (not possible in browser — needs server endpoint)

**Why it matters:** We need a server endpoint regardless. The question is how much metadata to include.

### Q6.3: New Level Creation
Should the editor support creating new levels from scratch?
- A) Yes, with a "New Level" button that creates a blank level with configurable dimensions
- B) No, create levels by copying existing JSON files manually
- C) Yes, with templates (empty dungeon, empty grass, etc.)

**Why it matters:** Currently you create levels by editing JSON files. A "New Level" flow would be a nice improvement but adds scope.

### Q6.4: Unsaved Changes Warning
Should the editor warn before switching levels or closing the tab if there are unsaved changes?

**Why it matters:** The current editor has `hasUnsavedChanges()` but doesn't use it for warnings. Losing work is painful.

---

## 7. Save System

### Q7.1: Auto-Save
Should the editor auto-save periodically, or only on explicit "Save" button click?
- A) Manual save only (current behavior)
- B) Auto-save every N seconds
- C) Auto-save on every change (like Google Docs)

**Why it matters:** Auto-save prevents data loss but could overwrite intentional states. The current `/api/save-level` endpoint writes directly to disk.

### Q7.2: Save Feedback
Currently saving logs to console + copies to clipboard + POSTs to dev server. In the standalone editor:
- A) Just POST to dev server with success/error toast notification
- B) POST + download JSON file as backup
- C) POST only, with visual confirmation in the UI

**Why it matters:** The clipboard/console workflow was a workaround. With a proper UI we can do better.

---

## 8. Grid Editing Specifics

### Q8.1: Paint Mode Interaction
Currently grid editing uses click-and-drag painting on the Phaser canvas. Should this stay the same in the standalone editor, or change?

**Why it matters:** Click-and-drag painting is the most efficient workflow for grid editing. Moving this to HTML would be worse. But we need to make sure canvas clicks don't conflict with HTML panel interactions.

### Q8.2: Cell Property Editing
Currently cell properties (wall, water, platform, etc.) are checkboxes in the Phaser overlay. Should these move to the HTML panel while painting stays on the canvas?

**Why it matters:** Having the tool selection in HTML and the painting on canvas is the natural split. But it means the user's eyes move between two areas.

---

## 9. Keyboard Shortcuts

### Q9.1: WASD Conflict
WASD is used for camera panning. In the standalone editor, typing in HTML input fields will conflict with WASD. How should this be handled?
- A) Disable WASD when an HTML input is focused (current approach with stopPropagation)
- B) Use different keys for camera panning (arrow keys only)
- C) Only enable WASD when mouse is over the canvas

**Why it matters:** This is the #1 pain point of the current editor. The standalone editor should solve it properly.

### Q9.2: Keyboard Shortcuts
Should the editor have keyboard shortcuts for common actions (e.g., G for grid mode, T for texture mode, Ctrl+S for save)?

**Why it matters:** Power users want shortcuts. But they need to not conflict with HTML input focus.

---

## 10. Undo/Redo

### Q10.1: Undo/Redo Priority
The feature request lists undo/redo as a "stretch goal." How important is it?
- A) Must have for v1
- B) Nice to have, implement if time allows
- C) Defer entirely to a future version

**Why it matters:** Undo/redo requires tracking all mutations as reversible commands. This is a significant architectural decision that affects how ALL edits are applied. If we want it, we need to design for it from the start.

---

## 11. Testing & Validation

### Q11.1: Level Validation
Should the editor validate level data before saving? For example:
- Player start position is on a walkable cell
- All exits reference valid target levels
- No entities placed on walls
- Trigger event names match entity createOnAnyEvent references

**Why it matters:** Currently there's no validation — you can save broken levels. Adding validation would catch common mistakes.

### Q11.2: Preview/Playtest
Should the editor have a "Play" button that launches the game at the current level for quick testing?
- A) Yes, open game in new tab at the current level
- B) Yes, switch the Phaser canvas from editor mode to game mode in-place
- C) No, just save and manually navigate to the game

**Why it matters:** Quick playtesting is extremely valuable for level design iteration.

---

## 12. Technical Concerns

### Q12.1: Shared Code Strategy
The editor and game share a lot of code (Grid, LevelLoader, AssetRegistry, theme renderers, entity factories). How should shared code be organized?
- A) Import directly from `src/` (both entry points share the same source)
- B) Extract shared code into a `src/shared/` directory
- C) Keep as-is, Vite tree-shaking handles it

**Why it matters:** The editor shouldn't bundle gameplay code (AI, combat, etc.) but needs rendering code. Clean boundaries prevent the editor from pulling in the entire game.

### Q12.2: Hot Module Replacement
Should the editor HTML panel support HMR (hot reload when editing UI code)?

**Why it matters:** HMR dramatically speeds up UI development. Vite supports it natively for HTML/CSS/JS but Phaser scenes don't hot-reload well.

### Q12.3: Production Build Exclusion
The feature request says "dev-only feature." Should the editor:
- A) Be completely excluded from production builds (not even in the bundle)
- B) Be built but only accessible via `/editor/` route
- C) Be behind a feature flag

**Why it matters:** Excluding from production keeps the game bundle small. But it means the editor only works with `npm run dev`.

---

## 13. Edge Cases

### Q13.1: Multiple Browser Tabs
What happens if someone opens the editor in two tabs editing the same level? Should we handle this?

**Why it matters:** Both tabs would POST to the same file. Last save wins. Probably fine for a dev tool but worth acknowledging.

### Q13.2: Large Levels
The largest current level is 40×30 cells. Should the editor handle much larger levels (100×100+)?

**Why it matters:** Affects whether we need virtual scrolling, level-of-detail rendering, or performance optimizations.

### Q13.3: NPC Interaction Editor
NPC interactions are the most complex editor feature (nested forms with flag conditions, position overrides, priority ordering). The current implementation uses HTML DOM elements overlaid on the Phaser canvas. Should this be redesigned or just moved to the HTML panel as-is?

**Why it matters:** This is the most complex UI in the editor. A proper HTML form would be much better than the current overlay, but it's also the most work to rebuild.

---

## Priority Questions (Answer These First)

The following questions have the biggest impact on architecture and should be answered before any others:

1. **Q3.1** — Reuse GameScene or new scene? (Determines rendering architecture)
2. **Q5.2** — Who owns editor state? (Determines data flow)
3. **Q5.3** — Who owns level data? (Determines mutation model)
4. **Q4.1** — UI framework choice? (Determines all HTML panel code)
5. **Q1.1** — Incremental or big bang? (Determines development approach)
6. **Q10.1** — Undo/redo priority? (Affects mutation architecture)
7. **Q3.2** — Entity representation? (Affects serialization and rendering)
