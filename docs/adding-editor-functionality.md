# Adding Editor Functionality

This guide covers how to add new editor modes and functionality based on lessons learned from implementing the Trigger system.

## Overview

The editor uses a state machine pattern with overlay UI. Each editor mode is a separate state that handles:
- UI creation/destruction
- Input handling (mouse clicks, keyboard)
- Visual feedback
- Data persistence

## Architecture

### EditorScene Structure
- **Overlay Scene** - Renders on top of paused GameScene
- **State Machine** - Manages different editor modes
- **Level Data Integration** - Reads/writes to GameScene's level data
- **Camera Control** - Stops following player, allows free movement

### State Hierarchy
```
EditorScene
├── DefaultEditorState (main menu)
├── GridEditorState (cell editing)
├── TriggerEditorState (trigger placement)
├── MoveEditorState (entity movement)
└── ResizeEditorState (grid resizing)
```

## Step-by-Step: Adding New Editor Mode

### 1. Create Editor State Class

```typescript
// src/editor/MyEditorState.ts
import { EditorState } from './EditorState';

export class MyEditorState extends EditorState {
  private selectedItems: Set<string> = new Set();
  private visualElements: Map<string, Phaser.GameObjects.GameObject> = new Map();

  onEnter(): void {
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearVisualElements();
  }

  private createUI(): void {
    // Create HTML UI elements
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    // Add input elements with event prevention
    const input = document.createElement('input');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // CRITICAL: Prevent WASD from moving camera
    });

    // Add buttons
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Item';
    addButton.onclick = () => this.addItem();

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.onclick = () => this.scene.enterDefaultMode();

    container.appendChild(input);
    container.appendChild(addButton);
    container.appendChild(backButton);
    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private clearVisualElements(): void {
    this.visualElements.forEach(element => element.destroy());
    this.visualElements.clear();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    // CRITICAL: Check for UI button clicks first
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        if ((obj as any).depth >= 1000) { // UI elements have high depth
          return; // Don't process grid clicks when clicking UI
        }
      }
    }

    // Process grid/world clicks
    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;
    
    const grid = this.scene.getGrid();
    const cell = grid.worldToCell(worldX, worldY);
    
    // Handle cell selection/deselection
    const cellKey = `${cell.col},${cell.row}`;
    
    if (this.selectedItems.has(cellKey)) {
      this.selectedItems.delete(cellKey);
      this.removeVisualElement(cellKey);
    } else {
      this.selectedItems.add(cellKey);
      this.addVisualElement(cellKey, cell);
    }
  };

  private addVisualElement(cellKey: string, cell: { col: number; row: number }): void {
    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();
    const worldPos = grid.cellToWorld(cell.col, cell.row);
    
    const visual = gameScene.add.rectangle(
      worldPos.x + grid.cellSize / 2,
      worldPos.y + grid.cellSize / 2,
      grid.cellSize,
      grid.cellSize
    );
    visual.setStrokeStyle(3, 0xff0000); // Red outline
    visual.setFillStyle(0x000000, 0); // Transparent fill
    visual.setDepth(Depth.editor);
    
    this.visualElements.set(cellKey, visual);
  }

  private removeVisualElement(cellKey: string): void {
    const visual = this.visualElements.get(cellKey);
    if (visual) {
      visual.destroy();
      this.visualElements.delete(cellKey);
    }
  }

  private addItem(): void {
    if (this.selectedItems.size === 0) {
      alert('Please select at least one cell');
      return;
    }

    // CRITICAL: Modify GameScene's level data directly
    const gameScene = this.scene.scene.get('game') as any;
    const levelData = gameScene.getLevelData();
    
    if (!levelData.myItems) {
      levelData.myItems = [];
    }

    const cells = Array.from(this.selectedItems).map(cellKey => {
      const [col, row] = cellKey.split(',').map(Number);
      return { col, row };
    });

    levelData.myItems.push({
      name: 'My Item',
      cells
    });

    this.scene.enterDefaultMode();
  }
}
```

### 2. Add to EditorScene State Machine

```typescript
// In EditorScene.ts
import { MyEditorState } from "../editor/MyEditorState";

// In state machine initialization
this.stateMachine = new StateMachine({
  // ... existing states
  myMode: new MyEditorState(this)
}, 'default');

// Add method
enterMyMode(): void {
  this.stateMachine.enter('myMode');
}
```

### 3. Add Button to Default Editor State

```typescript
// In DefaultEditorState.ts
const myButton = this.scene.add.text(centerX + buttonSpacing * 5, buttonY, 'My Mode', {
  fontSize: '24px',
  color: '#ffffff',
  backgroundColor: '#333333',
  padding: { x: 20, y: 10 }
});
myButton.setOrigin(0.5);
myButton.setScrollFactor(0);
myButton.setInteractive({ useHandCursor: true });
myButton.setDepth(Depth.editor);
this.buttons.push(myButton);

myButton.on('pointerdown', () => {
  this.scene.enterMyMode();
});
```

### 4. Update Level Data Structure

```typescript
// In LevelLoader.ts
export type LevelMyItem = {
  name: string;
  cells: Array<{ col: number; row: number }>;
}

export type LevelData = {
  // ... existing fields
  myItems?: LevelMyItem[];
}
```

### 5. Update Level Data Extraction

```typescript
// In EditorScene.getCurrentLevelData()
getCurrentLevelData(): LevelData {
  // ... extract other data
  
  // Get existing level data to preserve editor changes
  const existingLevelData = gameScene.getLevelData();
  
  return {
    // ... other fields
    myItems: existingLevelData.myItems, // Preserve from GameScene
  };
}
```

### 6. Add Loading in GameScene

```typescript
// In GameScene.spawnEntities()
if (level.myItems && level.myItems.length > 0) {
  for (const itemData of level.myItems) {
    // Create entities or apply data as needed
    console.log(`Loading item: ${itemData.name} with ${itemData.cells.length} cells`);
  }
}
```

## Critical Patterns and Pitfalls

### ✅ DO: Check UI Clicks Before Grid Clicks

**Always check if the user clicked a UI button before processing grid selection:**

```typescript
private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
  // CRITICAL: Check for UI button clicks first
  const gameScene = this.scene.scene.get('game');
  const hitObjects = gameScene.input.hitTestPointer(pointer);
  
  if (hitObjects.length > 0) {
    for (const obj of hitObjects) {
      if ((obj as any).depth >= 1000) { // UI elements have high depth
        return; // Don't process grid clicks when clicking UI
      }
    }
  }
  
  // Now safe to process grid clicks
};
```

**Why:** Without this check, clicking buttons will also select grid cells behind them.

### ✅ DO: Prevent Input Event Propagation

**Stop keyboard events from reaching the game:**

```typescript
this.eventNameInput.addEventListener('keydown', (e) => {
  e.stopPropagation(); // Prevents WASD from moving camera while typing
});
```

**Why:** Without this, typing in input fields will trigger game controls.

### ✅ DO: Track Visual Elements for Cleanup

**Always track and destroy visual elements:**

```typescript
private selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();

// On select
const border = gameScene.add.rectangle(...);
this.selectionRectangles.set(cellKey, border);

// On deselect
const rect = this.selectionRectangles.get(cellKey);
if (rect) {
  rect.destroy();
  this.selectionRectangles.delete(cellKey);
}

// On exit
private clearSelectionRectangles(): void {
  this.selectionRectangles.forEach(rect => rect.destroy());
  this.selectionRectangles.clear();
}
```

**Why:** Without tracking, deselected items keep their visual indicators, and memory leaks occur.

### ✅ DO: Modify GameScene Level Data Directly

**Always modify the source data, not computed data:**

```typescript
// ✅ CORRECT - modifies source data
const gameScene = this.scene.scene.get('game') as any;
const levelData = gameScene.getLevelData();
levelData.myItems.push(newItem);

// ❌ WRONG - modifies computed result
const levelData = this.scene.getCurrentLevelData();
levelData.myItems.push(newItem); // This won't persist!
```

**Why:** `getCurrentLevelData()` creates a temporary object. Changes to it are lost.

### ✅ DO: Register and Unregister Event Listeners

**Always clean up event listeners:**

```typescript
onEnter(): void {
  this.scene.input.on('pointerdown', this.handlePointerDown, this);
}

onExit(): void {
  this.scene.input.off('pointerdown', this.handlePointerDown, this);
  this.destroyUI();
}
```

**Why:** Without cleanup, event listeners persist and cause bugs when switching modes.

### ✅ DO: Use Arrow Functions for Event Handlers

**Use arrow functions to maintain `this` context:**

```typescript
private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
  // `this` refers to the class instance
};
```

**Why:** Regular functions lose `this` context when used as event handlers.

## Debug Visualization

### Add to Grid Rendering

```typescript
// In Grid.render() method - shows when G key pressed
if (levelData?.myItems) {
  for (const item of levelData.myItems) {
    for (const cell of item.cells) {
      const worldPos = this.cellToWorld(cell.col, cell.row);
      this.graphics.lineStyle(3, 0x00ff00, 1); // Green outline
      this.graphics.strokeRect(worldPos.x, worldPos.y, this.cellSize, this.cellSize);
    }
  }
}
```

### Update GameScene to Pass Level Data

```typescript
// In GameScene.update()
this.grid.render(this.entityManager, this.levelData);
```

## Common Anti-Patterns

### ❌ DON'T: Create Rectangles Every Frame

```typescript
// ❌ WRONG - creates new rectangles every frame
onUpdate(): void {
  for (const cellKey of this.selectedCells) {
    const [col, row] = cellKey.split(',').map(Number);
    const worldPos = grid.cellToWorld(col, row);
    gameScene.add.rectangle(...); // Memory leak!
  }
}
```

### ❌ DON'T: Forget to Check UI Depth

```typescript
// ❌ WRONG - doesn't check for UI clicks
private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
  // Immediately processes grid clicks, even when clicking buttons
  const cell = grid.worldToCell(worldX, worldY);
  // ...
};
```

### ❌ DON'T: Use Regular Functions for Event Handlers

```typescript
// ❌ WRONG - loses `this` context
onEnter(): void {
  this.scene.input.on('pointerdown', function(pointer) {
    // `this` is undefined here!
    this.handleClick(pointer); // Error!
  });
}
```

### ❌ DON'T: Modify Computed Level Data

```typescript
// ❌ WRONG - changes won't persist
private addItem(): void {
  const levelData = this.scene.getCurrentLevelData(); // Computed result
  levelData.myItems.push(newItem); // Lost when logging!
}
```

## Testing Checklist

- [ ] Button clicks don't select grid cells
- [ ] Typing in inputs doesn't move camera
- [ ] Cell selection/deselection works visually
- [ ] Items appear in logged JSON
- [ ] Items load correctly on refresh
- [ ] Event listeners are cleaned up on exit
- [ ] Visual elements are destroyed on exit
- [ ] Debug visualization shows (if applicable)
- [ ] No console errors when switching modes
- [ ] Memory doesn't leak with repeated use

## Performance Tips

- **Batch Visual Updates** - Don't create/destroy rectangles every frame
- **Use Object Pooling** - Reuse visual elements when possible
- **Limit Selection Size** - Prevent selecting thousands of cells
- **Debounce Input** - Don't process every mouse move event
- **Clean Up Properly** - Always destroy visual elements and remove listeners

## Future Patterns

- **Multi-Select with Drag** - Click and drag to select multiple cells
- **Copy/Paste** - Store selection and paste elsewhere
- **Undo/Redo** - Track changes and allow reversal
- **Templates** - Save common patterns for reuse
- **Validation** - Check for conflicts before adding items
- **Preview Mode** - Show what will be added before confirming
