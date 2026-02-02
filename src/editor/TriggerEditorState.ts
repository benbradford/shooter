import { EditorState } from './EditorState';
import type { LevelTrigger } from '../systems/level/LevelLoader';

const SELECTED_CELL_COLOR = 0xffffff; // White border for selected cells

export class TriggerEditorState extends EditorState {
  private selectedCells: Set<string> = new Set(); // "col,row" format
  private eventNameInput: HTMLInputElement | null = null;
  private selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  onEnter(): void {
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearSelectionRectangles();
    this.selectedCells.clear();
  }

  private clearSelectionRectangles(): void {
    this.selectionRectangles.forEach(rect => rect.destroy());
    this.selectionRectangles.clear();
  }

  private createUI(): void {
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
      max-width: 300px;
    `;

    // Event name input
    const eventLabel = document.createElement('div');
    eventLabel.textContent = 'Event Name:';
    eventLabel.style.marginBottom = '5px';
    container.appendChild(eventLabel);

    this.eventNameInput = document.createElement('input');
    this.eventNameInput.type = 'text';
    this.eventNameInput.placeholder = 'trigger_name';
    this.eventNameInput.style.cssText = `
      width: 100%;
      padding: 5px;
      margin-bottom: 10px;
      background: #333;
      color: white;
      border: 1px solid #666;
    `;
    this.eventNameInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
    container.appendChild(this.eventNameInput);

    // Instructions
    const instructions = document.createElement('div');
    instructions.textContent = 'Click grid cells to select trigger area';
    instructions.style.cssText = 'margin-bottom: 10px; font-size: 12px; color: #ccc;';
    container.appendChild(instructions);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px;';

    const addTriggerBtn = document.createElement('button');
    addTriggerBtn.textContent = 'Add Trigger';
    addTriggerBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none; cursor: pointer;';
    addTriggerBtn.onclick = () => this.addTrigger();
    buttonContainer.appendChild(addTriggerBtn);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.cssText = 'padding: 5px 10px; background: #666; color: white; border: none; cursor: pointer;';
    backBtn.onclick = () => this.scene.enterDefaultMode();
    buttonContainer.appendChild(backBtn);

    container.appendChild(buttonContainer);

    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private addTrigger(): void {
    const eventName = this.eventNameInput?.value.trim();
    if (!eventName) {
      alert('Please enter an event name');
      return;
    }

    if (this.selectedCells.size === 0) {
      alert('Please select at least one cell');
      return;
    }

    // Get the GameScene's level data directly
    const gameScene = this.scene.scene.get('game') as any;
    const levelData = gameScene.getLevelData();
    
    if (!levelData.triggers) {
      levelData.triggers = [];
    }

    const triggerCells = Array.from(this.selectedCells).map(cellKey => {
      const [col, row] = cellKey.split(',').map(Number);
      return { col, row };
    });

    const newTrigger: LevelTrigger = {
      eventName,
      triggerCells
    };

    levelData.triggers.push(newTrigger);
    this.scene.enterDefaultMode();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    // Check if click is on a Phaser UI element (buttons have depth 1000)
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    // If we hit any UI objects, ignore the grid click
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        if ((obj as any).depth >= 1000) { // UI elements have high depth
          return;
        }
      }
    }

    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;
    
    const grid = this.scene.getGrid();
    const cell = grid.worldToCell(worldX, worldY);
    
    if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) {
      return;
    }

    const cellKey = `${cell.col},${cell.row}`;
    
    if (this.selectedCells.has(cellKey)) {
      this.selectedCells.delete(cellKey);
      const rect = this.selectionRectangles.get(cellKey);
      if (rect) {
        rect.destroy();
        this.selectionRectangles.delete(cellKey);
      }
    } else {
      this.selectedCells.add(cellKey);
      const worldPos = grid.cellToWorld(cell.col, cell.row);
      const border = gameScene.add.rectangle(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        grid.cellSize,
        grid.cellSize
      );
      border.setStrokeStyle(3, SELECTED_CELL_COLOR);
      border.setFillStyle(0x000000, 0);
      border.setDepth(1000);
      this.selectionRectangles.set(cellKey, border);
    }
  };

  onUpdate(_delta: number): void {
    // Visual rendering is now handled in handlePointerDown
    // No need to recreate rectangles every frame
  }
}
