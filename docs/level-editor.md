# Level System and Editor

This document covers the level data structure, loading system, and in-game editor.

## Level Data Structure

```typescript
interface LevelData {
  width: number;          // Grid width in cells
  height: number;         // Grid height in cells
  playerStart: {
    x: number;            // Player start X in cells
    y: number;            // Player start Y in cells
  };
  cells: LevelCell[];     // Array of special cells
  robots?: LevelRobot[];  // Optional robot enemies
  bugBases?: LevelBugBase[]; // Optional bug spawners
  vignette?: VignetteConfig; // Optional screen overlay
}

interface LevelCell {
  col: number;            // Column position
  row: number;            // Row position
  layer?: number;         // Layer (-1 = pit, 0 = ground, 1 = platform)
  isTransition?: boolean; // Is this a staircase?
}
```

## Loading Levels

Levels are loaded from JSON files in `public/levels/`:

```typescript
// In GameScene.create() - must be async
async create() {
  const level = await LevelLoader.load('default');
  
  // Initialize grid with level data
  this.grid = new Grid(this, level.width, level.height, this.cellSize);
  
  // Apply level cells
  for (const cell of level.cells) {
    this.grid.setCell(cell.col, cell.row, {
      layer: cell.layer,
      isTransition: cell.isTransition
    });
  }
  
  // Use level player start position
  const startX = this.cellSize * level.playerStart.x;
  const startY = this.cellSize * level.playerStart.y;
  // ... create player at startX, startY
}
```

### Layer System

**Layer Values:**
- **-1**: Pits, water, lower areas
- **0**: Default ground level (default for all cells)
- **1**: Elevated platforms, upper floors
- **2+**: Higher levels

**Transition Cells:**
- Connect adjacent layers (e.g., layer 0 transition connects to layer 1)
- Only allow vertical movement (up/down)
- Don't block projectiles
- Must be placed adjacent to the platform they connect to

## Level Editor

The level editor allows you to pause the game, navigate the map, and edit grid cells and entities.

### Usage

**Press 'E'** to enter editor mode:
- Game resets to initial state (all entities at starting positions)
- Game pauses (stops updating but keeps rendering)
- Editor overlay appears with semi-transparent background
- Changes persist across editor sessions until saved

## Navigation

**WASD / Arrow Keys** - Move camera around the map while in editor mode
- Camera movement is unrestricted (not bounded to level size)
- Camera stops following player while in editor

## Editor State System

The editor uses a state machine with generic type support. Each state can accept typed data through props:

```typescript
interface IStateEnterProps<TData> {
  prevState?: IState<TData>;
  data?: TData;
}
```

States can specify their data type and access it via `props.data` in `onEnter()`.

## Editor Modes

### Default Mode

The initial mode when entering the editor. Shows buttons at the bottom and allows clicking entities:

**Buttons:**
- **Save** - Downloads level as JSON and logs to console
  - Greyed out when no changes made
  - Console shows full JSON for easy copy/paste
  - Downloads to ~/Downloads/default.json
  - Run `./scripts/update-levels.sh` to update game
- **Exit** - Returns to game (also ESC key)
- **Grid** - Enters grid editing mode
- **Add** - Enters add mode to place new entities
- **Texture** - Enters texture mode to paint background textures
- **Resize** - Enters resize mode for adding/removing rows/columns
- **Log** - Logs level JSON to console and copies to clipboard

**Entity Interaction:**
- **Click Player** - Enters Move mode for player
- **Click Robot** - Enters Edit Robot mode

### Move Mode

Allows dragging entities around the grid. Accepts `MoveEditorStateProps`:

```typescript
interface MoveEditorStateProps {
  entity: Entity;           // Entity to move
  returnState?: string;     // State to return to on Back (default: 'default')
}
```

**Usage:**
- Automatically starts dragging on enter
- Click and drag to move entity to different cells
- Release mouse to stop dragging
- Click again to resume dragging
- **Back** button returns to specified state (default or editRobot)

**Entry Points:**
- Click player in Default mode → Move player (returns to default)
- Click robot in Edit Robot mode → Move robot (returns to editRobot)

### Edit Robot Mode

Edit robot properties (health, speed). Accepts `Entity | undefined`:

**UI Panel (right side):**
- Shows current health and speed values
- **+10 / -10** buttons to adjust health (range: 1-1000)
- **+10 / -10** buttons to adjust speed (range: 10-500)
- **Back** button returns to Default mode

**Interaction:**
- Click robot again while selected → Enters Move mode for that robot

### Grid Mode

Allows selecting and modifying individual grid cells using keyboard navigation.

**Navigation:**
- **WASD / Arrow Keys** - Move selection to neighboring cells
  - Hold key to continuously move
  - Camera auto-centers on selected cell
  - 150ms delay between moves when holding
- Starts at center of grid when entering mode
- Yellow highlight shows selected cell

**Cell Editing Buttons:**
- **Back** - Return to default mode
- **Reset** - Reset cell to layer 0, no transition
- **Layer-2** - Set cell to layer -2
- **Layer-1** - Set cell to layer -1 (pit, lighter gray)
- **Layer0** - Set cell to layer 0 (ground, default)
- **Layer1** - Set cell to layer 1 (platform, darker gray)
- **Layer2** - Set cell to layer 2 (higher platform, darker gray)
- **TransUp** - Mark cell as transition (staircase, blue)
- **TransDown** - Mark cell as transition (staircase, blue)

**Visual Feedback:**
- Selected cell: Yellow border (0xffff00)
- Layer -1: Lighter gray (white with 0.25 alpha)
- Layer 0: Very light gray (0.1 alpha) - default
- Layer 1+: Darker gray (black with 0.4 alpha)
- Transitions: Blue overlay (0.5 alpha)
- Changes appear immediately

**Note:** TransUp and TransDown currently have the same effect (marking as transition). The distinction is for future functionality.

### Texture Mode

Allows painting background textures onto grid cells.

**UI Panel (right side):**
- Shows available textures with 60x60 previews
- Currently includes:
  - `dungeon_floor01` - Stone floor texture
  - `dungeon_floor02` - Alternate stone floor texture
- **Clear** button - Removes texture from cells

**Usage:**
1. Click a texture in the panel to select it (highlights green)
2. Click any grid cell to apply the selected texture
3. Click "Clear" to deselect, then click cells to remove textures
4. **Back** button returns to default mode

**Visual Feedback:**
- Selected texture has green background
- Textures render at depth -100 (behind all entities)
- Textures are scaled to fit cell size (128x128)
- Changes appear immediately

**Adding New Textures:**
1. Add texture file to `public/assets/dungeon/`
2. Register in `src/assets/AssetRegistry.ts`
3. Add to default assets in `src/assets/AssetLoader.ts`
4. Add texture name to `AVAILABLE_TEXTURES` array in `src/editor/TextureEditorState.ts`

**Note:** Background textures are saved in the level JSON and persist across sessions.

### Move Mode

Allows repositioning entities (currently player only) by dragging.

**Usage:**
1. Click and hold on the player sprite
2. Drag to move - player follows mouse and snaps to grid cells
3. Release to place player at new position
4. Green highlight box shows current grid cell

**Visual Feedback:**
- Green highlight box (0x00ff00) shows player's grid cell
- Box size matches grid cell size
- Player moves in real-time as you drag
- Position updates are saved when you click Save

**Back Button:**
- Returns to default mode

**Important:** The player's start position is saved in the level JSON's `playerStart` field when you click Save in default mode.

### Resize Mode

Allows selecting and removing rows or columns from the grid.

**Navigation:**
- **WASD / Arrow Keys** - Move camera (same as default mode)
- **Click near cell** - Selects nearest row or column
  - Algorithm determines if you're closer to horizontal or vertical edge
  - Orange highlight (0xff8800) shows selected row/column

**Controls:**
- **Back** - Return to default mode
- **Add Row** - Adds a new row at the bottom (all cells layer 0)
- **Add Col** - Adds a new column at the right (all cells layer 0)
- **Remove Row** - Removes selected row, shifts subsequent rows up
- **Remove Col** - Removes selected column, shifts subsequent columns left
- **Grid size display** - Top-right corner shows current dimensions (e.g., "Grid: 40x30")

**Constraints:**
- Minimum grid size: 10x10 (prevents accidentally making grid too small)
- Removes selected row/column and shifts all data to fill the gap

**Visual Feedback:**
- Selected row: Orange horizontal bar across entire grid width
- Selected column: Orange vertical bar across entire grid height
- Different color from Grid mode's yellow cell selection

## Saving Workflow

**To save and update level files:**

1. **In editor, click Save**
   - Logs complete JSON to browser console
   - Downloads `default.json` to `~/Downloads/`
   - Browser console shows:
     ```
     Level JSON (copy and paste into public/levels/default.json):
     { ... full JSON ... }
     ✓ Level saved to ~/Downloads/default.json
     To update the game, run: ./scripts/update-levels.sh
     ```

2. **Option A: Copy from console (fastest)**
   - Open browser console (F12)
   - Copy the JSON output
   - Paste into `public/levels/default.json`
   - Refresh browser

3. **Option B: Use the update script**
   ```bash
   ./scripts/update-levels.sh
   ```
   - Copies `default.json` from Downloads to `public/levels/`
   - Also copies any other level files (`level1.json`, etc.)
   - Shows confirmation messages
   - Refresh browser

**Note:** Browsers cannot directly write to the filesystem for security reasons. The console output + manual paste is the fastest workflow.

## Architecture

The editor uses Phaser's scene overlay system:

- **GameScene** - Main game scene (key: 'game')
  - Pauses when editor opens
  - Resumes when editor closes
  - Provides grid access and level data
  - Camera stops following player in editor

- **EditorScene** - Overlay UI scene (key: 'EditorScene')
  - Renders on top of paused GameScene
  - Uses StateMachine for mode management
  - Stops when exiting

### State Machine

**EditorState** - Base class for all editor states
- `DefaultEditorState` - Main menu with save/exit/grid/move/resize buttons
- `GridEditorState` - Cell selection and editing with keyboard navigation
- `MoveEditorState` - Entity repositioning with drag-and-drop
- `ResizeEditorState` - Row/column selection and removal

Each state manages its own UI elements and cleans up on exit.

## Implementation Details

### Change Detection

The editor tracks changes by comparing the current grid state with the original level data loaded from JSON. The save button is only enabled when changes are detected.

### Camera Control

**In Editor:**
- Camera stops following player
- Camera bounds expanded to very large area (-10000 to 20000)
- WASD moves camera freely in Default, Move, and Resize modes
- WASD moves selection (camera follows) in Grid mode

**On Exit:**
- Camera bounds restored to level size
- Camera resumes following player sprite

### Cell Selection (Grid Mode)

- Always one cell selected (never null)
- Starts at center of grid
- Keyboard navigation with auto-centering
- Hold key for continuous movement (150ms delay between moves)

### Entity Dragging (Move Mode)

**Coordinate Conversion:**
- Mouse position → World coordinates (accounting for camera scroll)
- World coordinates → Grid cell
- Grid cell → World center (cell top-left + cellSize/2)

**Rendering:**
- Highlight rectangle created in GameScene (not EditorScene)
- This ensures it scrolls with the camera properly
- EditorScene has scrollFactor(0) by default (UI overlay)

**Position Updates:**
- Updates both TransformComponent and Sprite directly
- Sprite update needed because game is paused (update() not running)
- Position saved to level JSON when clicking Save in default mode

### Row/Column Selection (Resize Mode)

Clicking near a cell determines the nearest row or column:
- Calculates distance to vertical edges (for column selection)
- Calculates distance to horizontal edges (for row selection)
- Selects whichever is closer

### Saving

Downloads a JSON file containing:
- Grid dimensions (width, height)
- Player start position (in cell coordinates)
- Array of cells with non-default properties (layer !== 0 or isTransition)

Only cells that differ from defaults are saved to keep file size small.

## Common Issues

### Player Spawning at Wrong Position

**Symptom:** Player always spawns at (0, 0) or top-left corner, regardless of saved position.

**Cause:** GridCollisionComponent initializes `previousX` and `previousY` to (0, 0). On first update, it thinks the player is moving from (0, 0) to spawn position. If there are walls in between, it blocks the movement and snaps player back to (0, 0).

**Solution:** GridCollisionComponent now initializes previous position to player's actual starting position on first frame.

### Green Box in Wrong Position (Move Mode)

**Symptom:** Green highlight box appears in top-right corner or doesn't align with grid.

**Cause:** Highlight rectangle was created in EditorScene, which has `scrollFactor(0)` by default (UI overlay). It doesn't scroll with the camera.

**Solution:** Highlight rectangle is now created in GameScene so it scrolls with the world.

### Player Hidden Behind Walls

**Symptom:** Player appears to be in wrong position, but logs show correct coordinates.

**Cause:** Layer 1 walls are drawn on top and blocking the view. Player is at correct position, just obscured.

**Solution:** Design levels so player starts in open areas (layer 0), not behind layer 1 walls.

## Future Features

Planned additions to the editor:
- Add rows/columns (not just remove)
- Place/remove walls
- Add enemy spawn points
- Add item/pickup locations
- Trigger zones
- Copy/paste regions
- Undo/redo
- Multiple level support
- Tilemap integration
- Multi-entity selection and movement

## Adding New Editor Modes

To add a new editor mode:

1. **Create state class** in `src/editor/`:
```typescript
import { EditorState } from './EditorState';
import type EditorScene from '../EditorScene';

export class MyEditorState extends EditorState {
  constructor(scene: EditorScene) {
    super(scene);
  }

  onEnter(_prevState?: IState): void {
    // Create UI elements
  }

  onExit(_nextState?: IState): void {
    // Clean up UI elements
  }

  onUpdate(_delta: number): void {
    // Update logic
  }
}
```

2. **Register in EditorScene.create()**:
```typescript
this.stateMachine = new StateMachine({
  default: new DefaultEditorState(this),
  grid: new GridEditorState(this),
  move: new MoveEditorState(this),
  resize: new ResizeEditorState(this),
  myMode: new MyEditorState(this)  // Add here
}, 'default');
```

3. **Add transition method**:
```typescript
enterMyMode(): void {
  this.stateMachine.enter('myMode');
}
```

4. **Add button in DefaultEditorState** to enter the new mode

## Best Practices

- Keep editor logic in EditorScene and state classes
- Don't modify GameScene directly unless necessary
- Use scene.pause/resume for clean state management
- Clean up all UI elements in state.onExit()
- Test that game works correctly after exiting editor
- Changes persist across editor sessions until page reload
- Always test player spawn position after moving in editor
