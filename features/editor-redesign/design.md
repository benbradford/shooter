# Standalone Level Editor — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  editor/index.html                                              │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Left Panel (70%)       │  │   Right Panel (30%)         │  │
│  │                          │  │                             │  │
│  │   Phaser Canvas          │  │   Toolbar.ts                │  │
│  │   ┌──────────────────┐   │  │   ContextPanel.ts           │  │
│  │   │  GameScene        │   │  │   TextureBrowser.ts         │  │
│  │   │  (editorMode)     │   │  │   EntityPalette.ts          │  │
│  │   │                  │   │  │   EntityForm.ts              │  │
│  │   │  Grid + Renderer │   │  │   CellForm.ts               │  │
│  │   │  Entities (paused)│   │  │   LevelInfo.ts              │  │
│  │   │  Camera (free)   │   │  │   Toast.ts                  │  │
│  │   └──────────────────┘   │  │                             │  │
│  │                          │  │                             │  │
│  │   CanvasInteraction.ts   │  │                             │  │
│  └──────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
│                    EditorBridge.ts (singleton)                   │
│                    ┌─────────────────────────┐                  │
│                    │ State (tool, selection)  │                  │
│                    │ Mutation wrapper         │                  │
│                    │ Snapshot history stack   │                  │
│                    │ Callbacks (Phaser→HTML)  │                  │
│                    └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

1. **Phaser scene owns all level data.** Grid, EntityManager, and LevelData live in GameScene. The HTML panel never holds its own copy — it reads from the bridge and sends commands through it.

2. **EditorBridge is the single mutation point.** Every edit operation flows through `_applyMutation()`, which snapshots state before applying. This enables future undo/redo without refactoring.

3. **Reuse existing serialization.** `extractEntities()` and `getCurrentLevelData()` (currently on EditorScene) are moved to EditorBridge, which calls the same GameScene accessors (`getGrid()`, `getEntityManager()`, `getLevelData()`).

4. **Vanilla HTML/CSS/JS.** No framework. Each panel is a TypeScript class that owns a DOM element and updates it imperatively.

5. **Canvas interaction is Phaser-native.** Mouse clicks on the canvas go through Phaser's input system. The `CanvasInteraction` handler reads the current tool from the bridge and dispatches accordingly.

6. **(Fixed: runtime violation #4, #5, #6) Bridge is the scene indirection layer.** CanvasInteraction and all app-lifetime objects NEVER store a direct scene reference. They always read the current scene from `bridge.getScene()`. After every scene restart, bridge updates its scene reference and fires `onSceneReady()`, which re-registers Phaser input listeners and the camera update loop.

7. **(Fixed: failure #2) Loading guard prevents operations during scene restart.** `bridge.isLoading` is `true` between scene restart and `onSceneReady()`. All mutation methods and canvas interaction handlers return early when loading.

8. **(Fixed: NEW-1, NEW-4) Entity placement is in-place, no scene restart.** `addEntity()` creates entities directly using `EntityLoader.createEntityCreator()` and adds them to EntityManager + levelData in memory. This is consistent with `removeEntity()` and avoids data loss from disk-reload on restart.

9. **(Fixed: NEW-2) Phaser listeners registered only after scene exists.** `CanvasInteraction` constructor registers DOM listeners only. Phaser input listeners are registered via `onSceneReady` callback after `GameScene.create()` completes.

10. **(Fixed: NEW-3) `loadLevel()` sets `isLoading = true` before restart.** Prevents canvas interactions from accessing a mid-shutdown scene during level switches.

11. **(Fixed: N1) Editor `create()` always notifies bridge, even on error.** The entire editor init path is wrapped in try/catch. `bridge.notifySceneReady()` fires unconditionally after the try/catch block, preventing `isLoading` from getting stuck true.

12. **(Fixed: N3) Drag batching recovers from orphaned drags.** A `window.blur` listener calls `endDragMutation()` if a drag is active. Additionally, `onPointerDown` resets any orphaned drag state before starting a new interaction.

---

## Data Flow

### HTML → Bridge → Phaser (Edit Operations)

```
User clicks "Wall" tool button
  → Toolbar.ts calls bridge.setTool('wall')
  → bridge.currentTool = 'wall'
  → bridge.selectedCellProperty = 'wall'

User clicks on canvas cell (col=5, row=3)
  → Phaser pointerdown event fires
  → CanvasInteraction reads bridge.currentTool === 'wall'
  → CanvasInteraction calls bridge.paintCell(5, 3)
  → bridge._applyMutation('Paint wall at 5,3', () => {
      const grid = this.scene.getGrid();
      const cell = grid.getCell(5, 3);
      cell.properties.add('wall');
      grid.setCell(5, 3, { layer: 1, properties: cell.properties });
      grid.render();
      this.scene.renderGrid(grid);
    })
  → _applyMutation snapshots BEFORE executing
  → isDirty = true
  → bridge.onDirtyStateChanged(true) → Toolbar updates indicator
```

### Phaser → Bridge → HTML (Selection Callbacks)

```
User clicks entity sprite on canvas
  → Phaser pointerdown event fires
  → CanvasInteraction detects entity hit
  → CanvasInteraction calls bridge.selectEntity(entity)
  → bridge.selectedEntity = entity
  → bridge.selectedCell = null
  → bridge.onEntityClicked(entity) callback fires
  → ContextPanel.ts receives entity
  → ContextPanel renders EntityForm with entity properties
```

### Level Save Flow

```
User clicks Save (or Ctrl+S)
  → Toolbar.ts calls bridge.saveLevel()
  → bridge.getLevelData() calls getCurrentLevelData()
    → extractGridCells(grid) — walks grid, builds cell array
    → extractEntities(entityManager, grid) — walks entities, builds entity array
    → Assembles LevelData JSON
  → POST to /api/save-level with { levelName, data: JSON.stringify(levelData) }
  → On success: bridge.isDirty = false, Toast.show('Saved!')
  → On failure: Toast.showError('Save failed')
```

### Level Switch Flow (Fixed: runtime violation #4, #5, #6)

```
User selects level from dropdown
  → Toolbar.ts calls bridge.loadLevel('dungeon1')
  → bridge checks isLoading → if true, return early (Fixed: failure #2)
  → bridge checks isDirty → if true, confirm() dialog
  → bridge.isLoading = true
  → bridge.historyStack = [] (clear history)
  → scene.scene.restart({ editorMode: true, levelName: 'dungeon1' })
  → GameScene.create() loads new level
  → GameScene calls bridge.setScene(this) then bridge.notifySceneReady()
  → bridge.onSceneReady fires → CanvasInteraction re-registers Phaser listeners
  → bridge.isLoading = false
  → bridge.onLevelLoaded fires → All HTML panels refresh
```

---

## EditorBridge Detailed Design

### Singleton + References

```typescript
class EditorBridge {
  private static instance: EditorBridge;
  private scene!: GameScene;
  private panelController!: PanelController;

  // --- Editor State ---
  currentTool: string = 'select';
  selectedCellProperty: CellProperty | null = null;
  selectedEntityType: EntityType | null = null;
  selectedEntity: Entity | null = null;
  selectedCell: { col: number; row: number } | null = null;
  selectedTexture: string | null = null;
  isDirty: boolean = false;
  currentLevelName: string | null = null;

  // --- Guards (Fixed: failure #2, #3) ---
  isLoading: boolean = false;
  private isSaving: boolean = false;
  private isDragBatching: boolean = false; // (Fixed: failure #5)

  // --- History (v1: accumulates, v2: undo/redo wired up) ---
  private readonly historyStack: string[] = [];
  private readonly redoStack: string[] = [];
  private static readonly MAX_HISTORY = 50;

  // --- Callbacks (Phaser → HTML) ---
  onCellClicked: ((col: number, row: number, cellData: CellData) => void) | null = null;
  onEntityClicked: ((entity: Entity) => void) | null = null;
  onSelectionCleared: (() => void) | null = null;
  onLevelLoaded: ((levelName: string, levelData: LevelData) => void) | null = null;
  onDirtyStateChanged: ((isDirty: boolean) => void) | null = null;
  onSceneReady: (() => void) | null = null; // (Fixed: runtime violation #4, #5, #6)
  onLoadError: ((levelName: string, error: unknown) => void) | null = null; // (Fixed: failure #1)

  static getInstance(): EditorBridge { /* singleton */ }

  // (Fixed: runtime violation #4) — scene accessor for CanvasInteraction
  getScene(): GameScene { return this.scene; }
  setScene(scene: GameScene): void { this.scene = scene; }
  setPanelController(ctrl: PanelController): void { this.panelController = ctrl; }

  // Called by GameScene.create() after editor-mode init completes
  notifySceneReady(): void {
    this.isLoading = false;
    this.onSceneReady?.();
    this.onLevelLoaded?.(this.currentLevelName!, this.getLevelData());
  }

  // --- Accessors (delegate to GameScene) ---
  getGrid(): Grid { return this.scene.getGrid(); }
  getEntityManager(): EntityManager { return this.scene.getEntityManager(); }
  getLevelData(): LevelData { return this.getCurrentLevelData(); }
}
```

### Mutation Wrapper — `_applyMutation()`

Every edit operation goes through this single method. It snapshots the full level state before applying the mutation, enabling future undo/redo.

```typescript
private _applyMutation(description: string, mutationFn: () => void): void {
  // (Fixed: failure #5) Skip snapshot during drag batching
  if (!this.isDragBatching) {
    // 1. Snapshot current state BEFORE mutation
    const snapshot = JSON.stringify(this.getCurrentLevelData());
    this.historyStack.push(snapshot);
    if (this.historyStack.length > EditorBridge.MAX_HISTORY) {
      this.historyStack.shift(); // drop oldest
    }

    // 2. Clear redo stack (any new mutation invalidates redo)
    this.redoStack.length = 0;
  }

  // 3. Execute the mutation
  mutationFn();

  // 4. Mark dirty
  if (!this.isDirty) {
    this.isDirty = true;
    this.onDirtyStateChanged?.(true);
  }
}
```

**(Fixed: failure #5) Paint-drag batching** — prevents per-cell snapshots during drag operations. One snapshot taken on pointerdown, mutations execute without snapshotting during drag, one undo reverses the entire stroke.

```typescript
beginDragMutation(): void {
  if (this.isDragBatching) return;
  this.isDragBatching = true;
  // Take ONE snapshot before the drag starts
  const snapshot = JSON.stringify(this.getCurrentLevelData());
  this.historyStack.push(snapshot);
  if (this.historyStack.length > EditorBridge.MAX_HISTORY) this.historyStack.shift();
  this.redoStack.length = 0;
}

endDragMutation(): void {
  this.isDragBatching = false;
}
```

**Why snapshot the entire level?** Simpler than tracking individual operations. Level JSON is small (~10-50KB). 50 snapshots = 0.5-2.5MB — negligible for a dev tool.

### Undo/Redo (v1: stubs, v2: implementation)

```typescript
undo(): void {
  // v1: stub
  console.log('[EditorBridge] undo() not yet implemented');
  // v2 implementation:
  // const snapshot = this.historyStack.pop();
  // if (!snapshot) return;
  // this.redoStack.push(JSON.stringify(this.getCurrentLevelData()));
  // const levelData = JSON.parse(snapshot) as LevelData;
  // this.scene.scene.restart({ editorMode: true, levelData });
}

redo(): void {
  // v1: stub
  console.log('[EditorBridge] redo() not yet implemented');
}
```

### Mutation Methods (all route through `_applyMutation`)

```typescript
paintCell(col: number, row: number): void {
  this._applyMutation(`Paint ${this.selectedCellProperty} at ${col},${row}`, () => {
    const grid = this.getGrid();
    const cell = grid.getCell(col, row);
    if (!cell || !this.selectedCellProperty) return;

    if (this.currentTool === 'floor') {
      // Floor clears all properties
      grid.setCell(col, row, { layer: 0, properties: new Set() });
    } else {
      cell.properties.add(this.selectedCellProperty);
      const layer = (this.selectedCellProperty === 'wall' || this.selectedCellProperty === 'platform') ? 1 : cell.layer;
      grid.setCell(col, row, { layer, properties: cell.properties });
    }
    grid.render();
    this.scene.renderGrid(grid);
  });
}

setCellTexture(col: number, row: number, textureKey: string): void {
  this._applyMutation(`Set texture ${textureKey} at ${col},${row}`, () => {
    const grid = this.getGrid();
    grid.setCell(col, row, { backgroundTexture: textureKey });
    grid.render();
    this.scene.renderGrid(grid);
  });
}

addEntity(type: EntityType, col: number, row: number, data: Record<string, unknown>): void {
  this._applyMutation(`Add ${type} at ${col},${row}`, () => {
    // (Fixed: runtime violation #3, NEW-1, NEW-4) — In-place entity creation.
    // Creates entity directly using EntityLoader.createEntityCreator() factory,
    // adds to EntityManager and levelData in memory. NO scene restart needed.
    // This is consistent with how removeEntity() works (in-place, no restart).
    const entityManager = this.getEntityManager();
    const grid = this.getGrid();
    const scene = this.getScene();
    const levelData = scene.getLevelData();

    // Generate lowest-available ID: skeleton0, skeleton1, etc.
    const allIds = new Set(entityManager.getAll().map(e => e.id));
    let idNum = 0;
    while (allIds.has(`${type}${idNum}`)) idNum++;
    const newId = `${type}${idNum}`;

    // Default data per entity type
    const defaults: Record<EntityType, Record<string, unknown>> = {
      skeleton:       { col, row, difficulty: 'medium' },
      thrower:        { col, row, difficulty: 'medium' },
      stalking_robot: { col, row, difficulty: 'medium', waypoints: [{ col, row }] },
      bug_base:       { col, row, difficulty: 'medium' },
      bullet_dude:    { col, row, difficulty: 'medium' },
      puma:           { col, row, difficulty: 'medium', startDirection: 4 },
      breakable:      { col, row, texture: 'dungeon_vase', health: 1, rarity: 'epic' },
      npc:            { col, row, assets: 'npc1', direction: 'Down', interactions: [] },
      trigger:        { eventToRaise: `event_${newId}`, triggerCells: [{ col, row }], oneShot: true },
      exit:           { targetLevel: '', targetCol: 0, targetRow: 0, triggerCells: [{ col, row }] },
      eventchainer:   { eventsToRaise: [] },
      cellmodifier:   { col, row },
      interaction:    { filename: '' },
    };

    const entityData = { ...defaults[type], ...data };
    const entityDef = { id: newId, type, data: entityData };

    // Create entity in-place using EntityLoader's factory
    const player = entityManager.getFirst('player');
    const entityLoader = scene.getEntityLoader();
    const creatorFn = entityLoader.createEntityCreator(entityDef, player!, levelData);
    if (!creatorFn) {
      console.error(`[EditorBridge] Unknown entity type: ${type}`);
      return;
    }
    const entity = creatorFn();
    entity.id = newId;
    entityManager.add(entity);

    // Update levelData in memory so serialization includes the new entity
    levelData.entities ??= [];
    levelData.entities.push(entityDef);

    // Auto-select the new entity
    this.selectedEntity = entity;
    this.onEntityClicked?.(entity);
  });
}

removeEntity(entityId: string): void {
  this._applyMutation(`Remove entity ${entityId}`, () => {
    const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
    if (entity) {
      entity.destroy();
      // Also remove from levelData
      const levelData = this.getScene().getLevelData();
      if (levelData.entities) {
        levelData.entities = levelData.entities.filter(e => e.id !== entityId);
      }
      this.selectedEntity = null;
      this.onSelectionCleared?.();
    }
  });
}

moveEntity(entityId: string, col: number, row: number): void {
  this._applyMutation(`Move ${entityId} to ${col},${row}`, () => {
    const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
    if (!entity) return;
    const grid = this.getGrid();
    const transform = entity.get(TransformComponent);
    if (transform) {
      transform.x = col * grid.cellSize;
      transform.y = row * grid.cellSize;
    }
  });
}

setTheme(theme: string): void {
  this._applyMutation(`Set theme to ${theme}`, () => {
    this.getScene().setTheme(theme as 'dungeon' | 'swamp' | 'grass' | 'wilds');
    this.getScene().renderGrid(this.getGrid());
  });
}

resizeGrid(width: number, height: number): void {
  // (Fixed: failure #4) Check for out-of-bounds entities before resizing
  const grid = this.getGrid();
  const entities = this.getEntityManager().getAll();
  const outOfBounds: Entity[] = [];

  for (const entity of entities) {
    if (entity.id === 'player') continue;
    const transform = entity.get(TransformComponent);
    if (!transform) continue;
    const cell = grid.worldToCell(transform.x, transform.y);
    if (cell.col >= width || cell.row >= height) {
      outOfBounds.push(entity);
    }
  }

  if (outOfBounds.length > 0) {
    const names = outOfBounds.map(e => e.id).join(', ');
    if (!confirm(`${outOfBounds.length} entities outside new bounds will be deleted: ${names}. Continue?`)) {
      return;
    }
  }

  this._applyMutation(`Resize grid to ${width}x${height}`, () => {
    // Remove out-of-bounds entities
    for (const entity of outOfBounds) {
      entity.destroy();
    }
    // Resize grid, re-render, update camera bounds
    grid.resize(width, height);
    grid.render();
    this.getScene().renderGrid(grid);
  });
}
```

### Serialization — Reusing Existing Code

`getCurrentLevelData()` and `extractEntities()` are lifted from `EditorScene.ts` into `EditorBridge.ts` with minimal changes. They already delegate to GameScene accessors:

```typescript
getCurrentLevelData(): LevelData {
  const grid = this.getGrid();
  const entityManager = this.getEntityManager();
  const existingLevelData = this.scene.getLevelData();

  const cells = this.extractGridCells(grid);
  const entities = this.extractEntities(entityManager, grid);

  const player = entityManager.getFirst('player');
  const playerTransform = player?.get(TransformComponent);
  const playerStart = playerTransform
    ? grid.worldToCell(playerTransform.x, playerTransform.y)
    : { col: existingLevelData.playerStart.x, row: existingLevelData.playerStart.y };

  return {
    width: grid.width,
    height: grid.height,
    playerStart: { x: playerStart.col, y: playerStart.row },
    cells,
    entities: entities.length > 0 ? entities : [],
    levelTheme: existingLevelData.levelTheme,
    background: existingLevelData.background
  };
}
```

`extractGridCells()` and `extractEntities()` are copied verbatim from `EditorScene.ts`. They read from `grid.getCell()` and walk `entityManager.getAll()` — no EditorScene-specific dependencies.

---

## GameScene Editor Mode

### What Changes in Editor Mode

GameScene receives `editorMode: true` via scene data from `editor/main.ts`. The `create()` method checks this flag and skips gameplay systems.

**Disabled when `editorMode` is true:**

| System | How Disabled |
|--------|-------------|
| EntityManager.update() | Skip call entirely — entities are paused |
| StateMachine (InGameState) | Don't create or enter |
| CollisionSystem | Don't create |
| HudScene | Don't launch |
| PetManager | Don't initialize |
| Player input | Don't create InputComponent |
| WorldState loading | Skip `loadFromFile()` |
| Ammo/health/timers | Skip all gameplay timers |
| E-key editor toggle | Skip (we ARE the editor) |
| Camera follow player | Skip — camera is free |

**Kept when `editorMode` is true:**

| System | Why |
|--------|-----|
| Grid creation + rendering | Need to see and edit the level |
| GameSceneRenderer (theme) | Floor, walls, vignette, background textures |
| Entity spawning (paused) | Need sprites visible at positions |
| Asset loading | All assets loaded upfront |
| `getGrid()`, `getEntityManager()`, `getLevelData()` | Bridge reads these |
| `renderGrid()`, `setTheme()` | Bridge calls these for edits |

### Editor Mode in `create()`

```typescript
async create(data?: { editorMode?: boolean; levelName?: string }) {
  this.isEditorMode = data?.editorMode ?? false;

  if (this.isEditorMode) {
    // Load specified level (or default)
    this.currentLevelName = data?.levelName ?? 'grass_overworld1';

    // (Fixed: N1) Wrap ENTIRE editor init in try/catch so notifySceneReady()
    // always fires even if asset loading or entity spawning fails unexpectedly.
    // This prevents isLoading from getting stuck true.
    try {
      // (Fixed: failure #1) try/catch around level load — fall back to empty level on failure
      try {
        this.levelData = await LevelLoader.load(this.currentLevelName);
      } catch (e) {
        console.error('[Editor] Failed to load level:', e);
        this.levelData = {
          width: 10, height: 10,
          playerStart: { x: 0, y: 0 },
          cells: [], entities: [],
          levelTheme: 'dungeon' as LevelTheme,
        };
        // Notify bridge of error so it can show toast
        EditorBridge.getInstance().onLoadError?.(this.currentLevelName, e);
      }

      // Load ALL assets upfront
      preloadAssets(this);
      preloadLevelAssets(this, this.levelData);
      this.load.start();
      await new Promise<void>(resolve => {
        if (this.load.isLoading()) {
          this.load.once('complete', resolve);
        } else { resolve(); }
      });

      // Initialize renderer + grid (same as normal)
      // ... theme selection, grid init, sceneRenderer ...

      // Spawn entities in editor mode (all immediately, no events)
      this.entityLoader = new EntityLoader(
        this, this.grid, this.entityManager, this.eventManager,
        this.entityCreatorManager, () => {} // no-op transition
      );
      this.spawnEntities(); // isEditorMode flag already on EntityLoader

      // Free camera — no follow, expanded bounds
      this.cameras.main.setBounds(-10000, -10000, 20000, 20000);
      this.cameras.main.setZoom(1);
    } catch (e) {
      // (Fixed: N1) Catch-all for unexpected errors during editor init.
      // Fall back to empty level so bridge.getGrid() etc. don't crash.
      console.error('[Editor] Scene init failed:', e);
      this.levelData = {
        width: 10, height: 10,
        playerStart: { x: 0, y: 0 },
        cells: [], entities: [],
        levelTheme: 'dungeon' as LevelTheme,
      };
      // Minimal grid init so bridge accessors work
      this.grid = new Grid(10, 10, 64);
      this.entityManager = new EntityManager();
      EditorBridge.getInstance().onLoadError?.(this.currentLevelName, e);
    }

    // (Fixed: runtime violation #2, N1) — ALWAYS notify bridge, even after error.
    // This ensures isLoading is cleared and panels refresh.
    const bridge = EditorBridge.getInstance();
    bridge.setScene(this);
    bridge.notifySceneReady();
    return; // Skip all gameplay setup
  }

  // ... normal gameplay create() continues below ...
}
```

### Editor Mode in `update()`

```typescript
update(time: number, delta: number): void {
  if (this.isEditorMode) {
    // Only render — no gameplay updates
    return;
  }
  // ... normal gameplay update ...
}
```

### Camera and Zoom

- Camera starts at zoom 1.0 (not CAMERA_ZOOM which is for gameplay)
- Bounds set to large area (-10000 to 20000) for free panning
- WASD panning handled by CanvasInteraction (not Phaser keyboard — see below)
- Mouse wheel zoom: min 0.25, max 3.0

---

## Canvas Interaction Handler

### WASD Gating — Solving the #1 Pain Point

The current editor's biggest problem: typing in Phaser text inputs triggers WASD camera panning. The standalone editor solves this by moving keyboard handling out of Phaser entirely and into DOM-level event listeners with explicit gating.

**The gating mechanism:**

```typescript
// editor/CanvasInteraction.ts

class CanvasInteraction {
  private isMouseOverCanvas = false;
  private readonly keysDown = new Set<string>();
  private readonly cameraSpeedPxPerSec = 400;

  // (Fixed: runtime violation #4, #5, #6) — NO stored scene reference.
  // Always read current scene from bridge.getScene().
  constructor(
    private readonly bridge: EditorBridge,
    private readonly canvasContainer: HTMLElement
  ) {
    // Track mouse over canvas container (the left panel div)
    canvasContainer.addEventListener('mouseenter', () => { this.isMouseOverCanvas = true; });
    canvasContainer.addEventListener('mouseleave', () => { this.isMouseOverCanvas = false; });

    // DOM-level keyboard listener — NOT Phaser's input system
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Mouse wheel zoom
    canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.bridge.isLoading) return; // (Fixed: failure #2)
      const camera = this.bridge.getScene().cameras.main;
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      camera.setZoom(Math.max(0.25, Math.min(3.0, camera.zoom + zoomDelta)));
    }, { passive: false });

    // (Fixed: NEW-2) — Do NOT call registerPhaserListeners() here.
    // Scene doesn't exist yet at construction time. The onSceneReady callback
    // handles initial registration after GameScene.create() completes.

    // (Fixed: N3) — If user alt-tabs during a paint drag, pointerup never fires
    // and isDragBatching gets stuck. Listen for window blur to clean up.
    window.addEventListener('blur', () => {
      if (this.isDragging) {
        this.bridge.endDragMutation();
        this.isDragging = false;
        this.lastPaintedCell = null;
      }
    });
  }

  // (Fixed: runtime violation #5) — Re-register Phaser input listeners after each scene restart.
  // Called from bridge.onSceneReady callback.
  registerPhaserListeners(): void {
    const scene = this.bridge.getScene();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    scene.input.on('pointerup', () => this.onPointerUp());
  }

  private isHtmlInputFocused(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Ctrl+S always works (save)
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.bridge.saveLevel();
      return;
    }

    // All other shortcuts: only when mouse over canvas AND no HTML input focused
    if (!this.isMouseOverCanvas || this.isHtmlInputFocused()) return;
    if (this.bridge.isLoading) return; // (Fixed: failure #2)

    this.keysDown.add(e.key.toLowerCase());

    switch (e.key.toLowerCase()) {
      case 'g': this.bridge.getScene().getGrid().setGridDebugEnabled(
        !this.bridge.getScene().getGrid().gridDebugEnabled); break;
      case 'delete': case 'backspace': this.bridge.deleteSelected(); break;
      case 'escape': this.bridge.clearSelection(); break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key.toLowerCase());
  }

  // (Fixed: runtime violation #6) — Called from bridge.onSceneReady, not once at startup.
  updateCamera(delta: number): void {
    if (!this.isMouseOverCanvas || this.isHtmlInputFocused()) return;
    if (this.bridge.isLoading) return; // (Fixed: failure #2)

    const speed = this.cameraSpeedPxPerSec * (delta / 1000);
    const camera = this.bridge.getScene().cameras.main;

    if (this.keysDown.has('a')) camera.scrollX -= speed;
    if (this.keysDown.has('d')) camera.scrollX += speed;
    if (this.keysDown.has('w')) camera.scrollY -= speed;
    if (this.keysDown.has('s') && !this.keysDown.has('control') && !this.keysDown.has('meta')) {
      camera.scrollY += speed;
    }
  }
}
```

**Why this works:**
- `mouseenter`/`mouseleave` on the canvas container div tracks hover state
- `isHtmlInputFocused()` checks `document.activeElement` tag name
- WASD only pans when BOTH conditions are true: mouse over canvas AND no input focused
- Ctrl+S bypasses both checks (always saves)
- Uses DOM `keydown`/`keyup` instead of Phaser's keyboard system — Phaser keyboard is NOT initialized in editor mode

### Click/Drag Routing by Tool

```typescript
private isDragging = false;
private lastPaintedCell: { col: number; row: number } | null = null;

private onPointerDown(pointer: Phaser.Input.Pointer): void {
  if (this.bridge.isLoading) return; // (Fixed: failure #2)

  // (Fixed: N3) Safety reset: if a previous drag was orphaned (e.g., user alt-tabbed
  // during paint drag and pointerup never fired), clean up before starting new interaction.
  if (this.isDragging) {
    this.bridge.endDragMutation();
    this.isDragging = false;
    this.lastPaintedCell = null;
  }

  const worldPoint = this.bridge.getScene().cameras.main.getWorldPoint(pointer.x, pointer.y);
  const grid = this.bridge.getGrid();
  const cell = grid.worldToCell(worldPoint.x, worldPoint.y);

  // Bounds check
  if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;

  const tool = this.bridge.currentTool;

  switch (tool) {
    case 'select':
      this.handleSelect(worldPoint, cell);
      break;
    case 'wall': case 'water': case 'platform': case 'stairs':
    case 'bridge': case 'blocked': case 'floor':
      this.isDragging = true;
      this.lastPaintedCell = cell;
      this.bridge.beginDragMutation(); // (Fixed: failure #5)
      this.bridge.paintCell(cell.col, cell.row);
      break;
    case 'texture':
      this.isDragging = true;
      this.lastPaintedCell = cell;
      this.bridge.beginDragMutation(); // (Fixed: failure #5)
      if (this.bridge.selectedTexture) {
        this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
      }
      break;
    case 'entity':
      if (this.bridge.selectedEntityType) {
        this.bridge.addEntity(this.bridge.selectedEntityType, cell.col, cell.row, {});
      }
      break;
    case 'move':
      this.handleMove(worldPoint, cell);
      break;
  }
}

private onPointerMove(pointer: Phaser.Input.Pointer): void {
  if (!this.isDragging || !pointer.isDown) return;
  if (this.bridge.isLoading) return; // (Fixed: failure #2)

  const worldPoint = this.bridge.getScene().cameras.main.getWorldPoint(pointer.x, pointer.y);
  const grid = this.bridge.getGrid();
  const cell = grid.worldToCell(worldPoint.x, worldPoint.y);

  // Skip if same cell as last paint (avoid duplicate mutations)
  if (this.lastPaintedCell?.col === cell.col && this.lastPaintedCell?.row === cell.row) return;
  if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;

  this.lastPaintedCell = cell;

  if (this.bridge.currentTool === 'texture' && this.bridge.selectedTexture) {
    this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
  } else {
    this.bridge.paintCell(cell.col, cell.row);
  }
}

private onPointerUp(): void {
  if (this.isDragging) {
    this.bridge.endDragMutation(); // (Fixed: failure #5)
  }
  this.isDragging = false;
  this.lastPaintedCell = null;
}
```

### Entity Hit Detection

```typescript
private handleSelect(worldPoint: Phaser.Math.Vector2, cell: { col: number; row: number }): void {
  // Check entities first (they're on top)
  const entities = this.bridge.getEntityManager().getAll();
  for (const entity of entities) {
    const sprite = entity.get(SpriteComponent);
    if (!sprite) continue;
    const bounds = sprite.sprite.getBounds();
    if (bounds.contains(worldPoint.x, worldPoint.y)) {
      this.bridge.selectEntity(entity);
      return;
    }
  }

  // No entity hit — select cell
  const cellData = this.bridge.getGrid().getCell(cell.col, cell.row);
  if (cellData) {
    this.bridge.selectCell(cell.col, cell.row, cellData);
  } else {
    this.bridge.clearSelection();
  }
}
```

---

## HTML Panel Architecture

### Panel Base Pattern

Each panel is a TypeScript class that owns a DOM element and updates it imperatively. No framework, no virtual DOM — just direct DOM manipulation.

```typescript
// Base pattern for all panels
class Panel {
  protected readonly el: HTMLElement;

  constructor(parent: HTMLElement, className: string) {
    this.el = document.createElement('div');
    this.el.className = className;
    parent.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}
```

### PanelController — Orchestrator

Owns all panels, wires up bridge callbacks, routes selection changes.

```typescript
class PanelController {
  private readonly toolbar: Toolbar;
  private readonly contextPanel: ContextPanel;
  private readonly textureBrowser: TextureBrowser;
  private readonly entityPalette: EntityPalette;
  private readonly toast: Toast;

  constructor(rightPanel: HTMLElement, bridge: EditorBridge) {
    this.toolbar = new Toolbar(rightPanel, bridge);
    this.contextPanel = new ContextPanel(rightPanel, bridge);
    this.textureBrowser = new TextureBrowser(rightPanel, bridge);
    this.entityPalette = new EntityPalette(rightPanel, bridge);
    this.toast = new Toast(document.body);

    // Wire bridge callbacks → panel updates
    bridge.onCellClicked = (col, row, cellData) => {
      this.contextPanel.showCellForm(col, row, cellData);
    };
    bridge.onEntityClicked = (entity) => {
      this.contextPanel.showEntityForm(entity);
    };
    bridge.onSelectionCleared = () => {
      this.contextPanel.showLevelInfo();
    };
    bridge.onLevelLoaded = (levelName) => {
      this.toolbar.setLevelName(levelName);
      this.contextPanel.showLevelInfo();
    };
    bridge.onDirtyStateChanged = (isDirty) => {
      this.toolbar.setDirtyIndicator(isDirty);
    };
  }
}
```

### Toolbar

Always visible at top. Contains level selector, save/play buttons, tool buttons, theme dropdown.

```typescript
class Toolbar extends Panel {
  private levelSelect!: HTMLSelectElement;
  private dirtyIndicator!: HTMLSpanElement;

  constructor(parent: HTMLElement, private readonly bridge: EditorBridge) {
    super(parent, 'toolbar');
    this.buildLevelSelector();
    this.buildActionButtons();
    this.buildToolButtons();
    this.buildThemeSelector();
  }

  private buildToolButtons(): void {
    const tools = [
      { id: 'select', label: 'Select' },
      { id: 'wall', label: 'Wall' },
      { id: 'floor', label: 'Floor' },
      { id: 'water', label: 'Water' },
      { id: 'platform', label: 'Platform' },
      { id: 'stairs', label: 'Stairs' },
      { id: 'bridge', label: 'Bridge' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'texture', label: 'Texture' },
      { id: 'entity', label: 'Entity' },
      { id: 'move', label: 'Move' },
    ];

    const container = document.createElement('div');
    container.className = 'tool-buttons';

    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.textContent = tool.label;
      btn.dataset.tool = tool.id;
      btn.addEventListener('click', () => {
        this.bridge.setTool(tool.id);
        this.highlightActiveTool(tool.id);
      });
      container.appendChild(btn);
    }

    this.el.appendChild(container);
  }

  private highlightActiveTool(toolId: string): void {
    const buttons = this.el.querySelectorAll('.tool-buttons button');
    buttons.forEach(btn => {
      (btn as HTMLElement).classList.toggle('active', btn.getAttribute('data-tool') === toolId);
    });
  }
}
```

### ContextPanel — Context-Sensitive

Shows different content based on what's selected. Delegates to sub-panels.

```typescript
class ContextPanel extends Panel {
  private currentView: Panel | null = null;

  showLevelInfo(): void {
    this.clear();
    this.currentView = new LevelInfo(this.el, this.bridge);
  }

  showCellForm(col: number, row: number, cellData: CellData): void {
    this.clear();
    this.currentView = new CellForm(this.el, this.bridge, col, row, cellData);
  }

  showEntityForm(entity: Entity): void {
    this.clear();
    this.currentView = new EntityForm(this.el, this.bridge, entity);
  }

  private clear(): void {
    this.currentView?.destroy();
    this.currentView = null;
    this.el.innerHTML = '';
  }
}
```

### EntityForm — Per-Type Property Editing

Builds form controls dynamically based on entity type. Changes apply immediately through bridge.

```typescript
class EntityForm extends Panel {
  constructor(parent: HTMLElement, bridge: EditorBridge, entity: Entity) {
    super(parent, 'entity-form');

    // Common fields for all entities
    this.addReadonlyField('ID', entity.id);
    this.addReadonlyField('Type', entity.type);
    this.addPositionFields(entity, bridge);
    this.addEventFields(entity, bridge);

    // Type-specific fields
    if (entity.id.startsWith('skeleton') || entity.id.startsWith('thrower') /* etc */) {
      this.addDifficultyDropdown(entity, bridge);
    }
    if (entity.id.startsWith('npc') || entity.tags?.has('npc')) {
      this.addNPCInteractionEditor(entity, bridge);
    }
    if (entity.id.startsWith('trigger')) {
      this.addTriggerFields(entity, bridge);
    }
    // ... other entity types
  }

  private addDifficultyDropdown(entity: Entity, bridge: EditorBridge): void {
    const difficulty = entity.get(DifficultyComponent);
    const select = document.createElement('select');
    for (const opt of ['easy', 'medium', 'hard']) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      option.selected = difficulty?.difficulty === opt;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      bridge.updateEntity(entity.id, { difficulty: select.value });
    });
    this.el.appendChild(this.wrapLabel('Difficulty', select));
  }
}
```

### TextureBrowser — Searchable Grid

```typescript
class TextureBrowser extends Panel {
  private searchInput!: HTMLInputElement;
  private grid!: HTMLDivElement;
  private allTextures: string[] = [];

  constructor(parent: HTMLElement, private readonly bridge: EditorBridge) {
    super(parent, 'texture-browser');
    this.buildSearch();
    this.buildGrid();
  }

  private buildSearch(): void {
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search textures...';
    this.searchInput.addEventListener('input', () => this.filterTextures());
    this.el.appendChild(this.searchInput);
  }

  private filterTextures(): void {
    const query = this.searchInput.value.toLowerCase();
    const items = this.grid.querySelectorAll('.texture-item');
    items.forEach(item => {
      const key = (item as HTMLElement).dataset.key ?? '';
      (item as HTMLElement).style.display = key.includes(query) ? '' : 'none';
    });
  }

  populateFromScene(scene: Phaser.Scene): void {
    // Get all texture keys from scene.textures
    // Create <img> thumbnails using canvas extraction
    // Include SPRITESHEET_TEXTURES sub-sprites
  }
}
```

### Toast — Notification System

```typescript
class Toast {
  private readonly container: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    parent.appendChild(this.container);
  }

  show(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}
```

---

## Vite Configuration

### Multi-Page Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

export default defineConfig({
  plugins: [saveLevelPlugin(), levelsApiPlugin()],
  build: {
    rollupOptions: {
      // ONLY the game — editor excluded from production
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});
```

During `npm run dev`, Vite serves both:
- `/` → `index.html` (game)
- `/editor/` → `editor/index.html` (editor)

During `npm run build`, only `index.html` is built. The `editor/` directory is not included in `build.rollupOptions.input`, so it's excluded entirely.

### `/api/levels` Endpoint

```typescript
function levelsApiPlugin(): Plugin {
  return {
    name: 'levels-api',
    configureServer(server) {
      server.middlewares.use('/api/levels', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        const levelsDir = path.resolve('public/levels');
        const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

        const levels = files.map(f => {
          const data = JSON.parse(fs.readFileSync(path.join(levelsDir, f), 'utf-8'));
          return {
            filename: f.replace('.json', ''),
            width: data.width ?? 0,
            height: data.height ?? 0,
            theme: data.levelTheme ?? 'dungeon',
          };
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(levels));
      });
    },
  };
}
```

### Editor Entry Point

```html
<!-- editor/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Dodging Bullets — Level Editor</title>
  <link rel="stylesheet" href="./editor.css">
</head>
<body>
  <div id="editor-root">
    <div id="canvas-container"></div>
    <div id="panel-container"></div>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

```css
/* editor/editor.css */
html, body, #editor-root { margin: 0; height: 100vh; overflow: hidden; }
#editor-root { display: flex; }
#canvas-container { width: 70%; height: 100%; position: relative; }
#panel-container { width: 30%; height: 100%; overflow-y: auto; background: #1a1a2e; color: #eee; font-family: sans-serif; }
```

```typescript
// editor/main.ts
import Phaser from 'phaser';
import GameScene from '../src/scenes/GameScene';
import { EditorBridge } from './EditorBridge';
import { PanelController } from './panels/PanelController';
import { CanvasInteraction } from './CanvasInteraction';

// (Fixed: runtime violation #1) — Do NOT pass active: true.
// GameScene is registered but not started until we're ready.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'canvas-container',
  width: 1280,
  height: 720,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
});

game.events.once('ready', () => {
  const canvasContainer = document.getElementById('canvas-container')!;
  const panelContainer = document.getElementById('panel-container')!;

  // (Fixed: runtime violation #2) — Create bridge and panels BEFORE starting scene.
  // This ensures onLevelLoaded callback is registered before GameScene.create() fires it.
  const bridge = EditorBridge.getInstance();

  const panels = new PanelController(panelContainer, bridge);
  bridge.setPanelController(panels);

  // (Fixed: runtime violation #4, #5, #6) — CanvasInteraction reads scene from bridge,
  // never stores a direct reference. Re-registers Phaser listeners on each scene ready.
  const interaction = new CanvasInteraction(bridge, canvasContainer);

  // Wire onSceneReady to re-register Phaser listeners and camera update loop
  bridge.onSceneReady = () => {
    interaction.registerPhaserListeners();
    // Re-register camera update on the NEW scene's update event
    bridge.getScene().events.on('update', (_time: number, delta: number) => {
      interaction.updateCamera(delta);
    });
  };

  // Wire onLoadError to show toast
  bridge.onLoadError = (levelName: string, error: unknown) => {
    panels.toast.show(`Failed to load ${levelName}: ${error}`, 'error');
  };

  // NOW start the scene — GameScene.create() will call bridge.notifySceneReady()
  // which fires onSceneReady (registers listeners) then onLevelLoaded (refreshes panels)
  game.scene.start('game', { editorMode: true, levelName: 'grass_overworld1' });
});

// Prevent accidental tab close
window.addEventListener('beforeunload', (e) => {
  const bridge = EditorBridge.getInstance();
  if (bridge.isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

---

## Level Management

### Loading a Level

Level loading always goes through a full Phaser scene restart. This reuses the existing GameScene initialization path and avoids partial-state bugs.

```typescript
// EditorBridge
loadLevel(levelName: string): void {
  if (this.isLoading) return; // (Fixed: NEW-3) prevent rapid switching
  if (this.isDirty) {
    if (!confirm('You have unsaved changes. Continue?')) return;
  }
  this.isLoading = true; // (Fixed: NEW-3) set BEFORE restart so all guards are effective
  this.historyStack.length = 0;
  this.redoStack.length = 0;
  this.isDirty = false;
  this.selectedEntity = null;
  this.selectedCell = null;
  this.currentLevelName = levelName;
  this.scene.scene.restart({ editorMode: true, levelName });
}
```

After restart, `GameScene.create()` runs with the new level name, loads the JSON, initializes grid/entities, and calls `bridge.onLevelLoaded()`. The PanelController receives this callback and refreshes all panels.

### Creating a New Level

```typescript
// EditorBridge
async newLevel(name: string, width: number, height: number, theme: string): Promise<void> {
  const levelData: LevelData = {
    width,
    height,
    playerStart: { x: 0, y: 0 },
    cells: [],
    entities: [],
    levelTheme: theme as LevelTheme,
  };

  // Save to disk first
  const response = await fetch('/api/save-level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelName: name, data: JSON.stringify(levelData) }),
  });

  if (!response.ok) throw new Error('Failed to create level');

  // Load the new level
  this.loadLevel(name);
}
```

### Unsaved Changes Protection

```typescript
// In editor/main.ts — prevent accidental tab close
window.addEventListener('beforeunload', (e) => {
  const bridge = EditorBridge.getInstance();
  if (bridge.isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

### Save

```typescript
// EditorBridge
async saveLevel(): Promise<void> {
  // (Fixed: failure #7) Show toast instead of silent return
  if (!this.currentLevelName) {
    this.panelController.toast.show('Cannot save: no level name', 'error');
    return;
  }

  // (Fixed: failure #3) Prevent concurrent saves and stale-save corruption
  if (this.isSaving || this.isLoading) return;
  this.isSaving = true;
  const savingLevelName = this.currentLevelName;

  try {
    const levelData = this.getCurrentLevelData();
    // (Fixed: failure #6) Wrap fetch in try/catch for network errors
    const response = await fetch('/api/save-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        levelName: savingLevelName,
        data: JSON.stringify(levelData, null, 2),
      }),
    });

    // (Fixed: failure #3) If level changed during save, discard result
    if (this.currentLevelName !== savingLevelName) {
      this.panelController.toast.show(`Save of ${savingLevelName} discarded (level changed)`, 'error');
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    this.isDirty = false;
    this.onDirtyStateChanged?.(false);
    this.panelController.toast.show(`Saved ${savingLevelName}`);
  } catch (e) {
    this.panelController.toast.show(`Save failed: ${(e as Error).message}`, 'error');
  } finally {
    this.isSaving = false;
  }
}
```

---

## Key Code Patterns

### Pattern 1: Every Edit Goes Through `_applyMutation`

No mutation method ever modifies the grid, entities, or level data directly. All go through the wrapper:

```typescript
// ✅ Correct — snapshot taken before mutation
setCellLayer(col: number, row: number, layer: number): void {
  this._applyMutation(`Set layer ${layer} at ${col},${row}`, () => {
    const grid = this.getGrid();
    const cell = grid.getCell(col, row);
    if (cell) {
      grid.setCell(col, row, { layer, properties: cell.properties });
      grid.render();
      this.scene.renderGrid(grid);
    }
  });
}

// ❌ Wrong — bypasses snapshot
setCellLayer(col: number, row: number, layer: number): void {
  const grid = this.getGrid();
  grid.setCell(col, row, { layer });
  grid.render();
}
```

### Pattern 2: HTML Panel Reads, Bridge Mutates

HTML panels never modify game state directly. They read from the bridge and call bridge methods:

```typescript
// ✅ Correct — panel reads from bridge, calls bridge to mutate
class CellForm extends Panel {
  constructor(parent: HTMLElement, bridge: EditorBridge, col: number, row: number, cellData: CellData) {
    super(parent, 'cell-form');
    const layerInput = document.createElement('input');
    layerInput.type = 'number';
    layerInput.value = String(cellData.layer);
    layerInput.addEventListener('change', () => {
      bridge.setCellLayer(col, row, Number.parseInt(layerInput.value));
    });
    this.el.appendChild(layerInput);
  }
}

// ❌ Wrong — panel reaches into grid directly
layerInput.addEventListener('change', () => {
  bridge.getGrid().setCell(col, row, { layer: Number.parseInt(layerInput.value) });
});
```

### Pattern 3: Phaser Scene Owns Data, Bridge Delegates

The bridge never stores its own copy of level data. It always delegates to GameScene:

```typescript
// Bridge delegates to GameScene accessors
getGrid(): Grid { return this.scene.getGrid(); }
getEntityManager(): EntityManager { return this.scene.getEntityManager(); }

// Serialization reuses existing code from EditorScene
getCurrentLevelData(): LevelData {
  // Same logic as EditorScene.getCurrentLevelData()
  // Calls this.getGrid(), this.getEntityManager(), this.scene.getLevelData()
}
```

### Pattern 4: WASD Gating via Two Conditions

Every keyboard shortcut (except Ctrl+S) checks both conditions:

```typescript
// Both must be true for shortcuts to fire
if (!this.isMouseOverCanvas || this.isHtmlInputFocused()) return;
```

This prevents:
- Typing "w" in a text field from panning the camera
- Pressing Delete while naming a level from deleting an entity
- Any keyboard shortcut from firing while interacting with HTML controls

### Pattern 5: Drag Painting Deduplicates Per Cell

During click-and-drag painting, we track the last painted cell to avoid calling `_applyMutation` multiple times for the same cell:

```typescript
private onPointerMove(pointer: Phaser.Input.Pointer): void {
  if (!this.isDragging || !pointer.isDown) return;
  const cell = grid.worldToCell(worldPoint.x, worldPoint.y);

  // Skip if same cell — prevents duplicate snapshots
  if (this.lastPaintedCell?.col === cell.col && this.lastPaintedCell?.row === cell.row) return;

  this.lastPaintedCell = cell;
  this.bridge.paintCell(cell.col, cell.row);
}
```

### Pattern 6: Scene Restart for Level Switching

Level switching always uses `scene.scene.restart()` rather than trying to hot-swap data in place. This reuses the full GameScene initialization path and avoids partial-state bugs:

```typescript
// Level switch = full scene restart
this.scene.scene.restart({ editorMode: true, levelName: 'dungeon1' });

// NOT: manually clearing grid, destroying entities, reloading...
```

After restart, `GameScene.create()` runs the normal initialization with the new level, then notifies the bridge via `onLevelLoaded`.
