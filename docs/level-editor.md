# Level Editor

The level editor allows you to pause the game, navigate the map, and edit grid cells.

## Usage

**Press 'E'** to enter editor mode:
- Game pauses (stops updating but keeps rendering)
- Editor overlay appears with semi-transparent background
- Changes persist across editor sessions until saved

## Navigation

**WASD / Arrow Keys** - Move camera around the map while in editor mode
- Camera movement is unrestricted (not bounded to level size)
- Camera stops following player while in editor

## Editor Modes

The editor uses a state machine with multiple modes:

### Default Mode

The initial mode when entering the editor. Shows four buttons at the bottom:

- **Save** - Downloads level as JSON to ~/Downloads/default.json
  - Greyed out when no changes made
  - Only enabled when changes have been detected
  - Console shows instructions: `./scripts/update-levels.sh`
- **Exit** - Returns to game (also ESC key)
  - Restores camera bounds and player following
- **Grid** - Enters grid editing mode
- **Resize** - Enters resize mode for adding/removing rows/columns

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

### Resize Mode

Allows selecting and removing rows or columns from the grid.

**Navigation:**
- **WASD / Arrow Keys** - Move camera (same as default mode)
- **Click near cell** - Selects nearest row or column
  - Algorithm determines if you're closer to horizontal or vertical edge
  - Orange highlight (0xff8800) shows selected row/column

**Controls:**
- **Back** - Return to default mode
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
   - Downloads `default.json` to `~/Downloads/`
   - Browser console shows:
     ```
     ✓ Level saved to ~/Downloads/default.json
     To update the game, run: ./scripts/update-levels.sh
     ```

2. **Run the update script:**
   ```bash
   ./scripts/update-levels.sh
   ```
   - Copies `default.json` from Downloads to `public/levels/`
   - Also copies any other level files (`level1.json`, etc.)
   - Shows confirmation messages

3. **Refresh browser**
   - Level reloads with your changes

**Note:** Browsers cannot directly write to the filesystem for security reasons. The download + script approach is the simplest solution without requiring a backend server.

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
- `DefaultEditorState` - Main menu with save/exit/grid/resize buttons
- `GridEditorState` - Cell selection and editing with keyboard navigation
- `ResizeEditorState` - Row/column selection and removal

Each state manages its own UI elements and cleans up on exit.

## Implementation Details

### Change Detection

The editor tracks changes by comparing the current grid state with the original level data loaded from JSON. The save button is only enabled when changes are detected.

### Camera Control

**In Editor:**
- Camera stops following player
- Camera bounds expanded to very large area (-10000 to 20000)
- WASD moves camera freely in Default and Resize modes
- WASD moves selection (camera follows) in Grid mode

**On Exit:**
- Camera bounds restored to level size
- Camera resumes following player sprite

### Cell Selection (Grid Mode)

- Always one cell selected (never null)
- Starts at center of grid
- Keyboard navigation with auto-centering
- Hold key for continuous movement (150ms delay between moves)

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

## Future Features

Planned additions to the editor:
- Add rows/columns (not just remove)
- Place/remove walls
- Move player start position
- Add enemy spawn points
- Add item/pickup locations
- Trigger zones
- Copy/paste regions
- Undo/redo
- Multiple level support
- Tilemap integration

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
