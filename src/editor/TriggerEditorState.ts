import { EditorState } from './EditorState';
import type { IStateEnterProps } from '../systems/state/IState';

const SELECTED_CELL_COLOR = 0xffffff;

export class TriggerEditorState extends EditorState<number> {
  private readonly selectedCells: Set<string> = new Set();
  private eventNameInput: HTMLInputElement | null = null;
  private readonly selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private editingTriggerIndex: number = -1;

  onEnter(props?: IStateEnterProps<number>): void {
    this.editingTriggerIndex = props?.data ?? -1;
    
    if (this.editingTriggerIndex >= 0) {
      this.loadExistingTrigger();
    }
    
    this.createUI();
    this.renderSelectionRectangles();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private loadExistingTrigger(): void {
    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    const triggers = levelData.entities?.filter(e => e.type === 'trigger') ?? [];
    const trigger = triggers[this.editingTriggerIndex];
    
    if (!trigger) return;
    
    const data = trigger.data as { triggerCells: Array<{ col: number; row: number }> };
    for (const cell of data.triggerCells) {
      this.selectedCells.add(`${cell.col},${cell.row}`);
    }
  }

  private renderSelectionRectangles(): void {
    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();
    
    for (const cellKey of this.selectedCells) {
      const [col, row] = cellKey.split(',').map(Number);
      const worldPos = grid.cellToWorld(col, row);
      const border = gameScene.add.rectangle(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        grid.cellSize,
        grid.cellSize
      );
      border.setStrokeStyle(3, 0xffffff);
      border.setFillStyle(0x000000, 0);
      border.setDepth(1000);
      this.selectionRectangles.set(cellKey, border);
    }
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearSelectionRectangles();
    this.selectedCells.clear();
    this.editingTriggerIndex = -1;
  }

  private clearSelectionRectangles(): void {
    this.selectionRectangles.forEach(rect => rect.destroy());
    this.selectionRectangles.clear();
  }

  private createUI(): void {
    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    const triggers = levelData.entities?.filter(e => e.type === 'trigger') ?? [];
    const triggerEntity = this.editingTriggerIndex >= 0 ? triggers[this.editingTriggerIndex] : null;
    const triggerData = triggerEntity?.data as { eventToRaise: string; oneShot: boolean } | undefined;

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px; max-width: 300px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 300px;
    `;

    const eventLabel = document.createElement('div');
    eventLabel.textContent = 'Event Name:';
    eventLabel.style.marginBottom = '5px';
    container.appendChild(eventLabel);

    this.eventNameInput = document.createElement('input');
    this.eventNameInput.type = 'text';
    this.eventNameInput.placeholder = 'trigger_name';
    this.eventNameInput.value = triggerData?.eventToRaise ?? '';
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

    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.cssText = 'margin-bottom: 10px;';
    
    const oneShotCheckbox = document.createElement('input');
    oneShotCheckbox.type = 'checkbox';
    oneShotCheckbox.id = 'oneShot';
    oneShotCheckbox.checked = triggerData?.oneShot ?? true;
    
    const oneShotLabel = document.createElement('label');
    oneShotLabel.htmlFor = 'oneShot';
    oneShotLabel.textContent = ' One-shot trigger';
    oneShotLabel.style.cursor = 'pointer';
    
    checkboxContainer.appendChild(oneShotCheckbox);
    checkboxContainer.appendChild(oneShotLabel);
    container.appendChild(checkboxContainer);

    const instructions = document.createElement('div');
    instructions.textContent = 'Click grid cells to select trigger area';
    instructions.style.cssText = 'margin-bottom: 10px; font-size: 12px; color: #ccc;';
    container.appendChild(instructions);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = this.editingTriggerIndex >= 0 ? 'Save' : 'Add Trigger';
    saveBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none; cursor: pointer;';
    saveBtn.onclick = () => this.saveTrigger();
    buttonContainer.appendChild(saveBtn);

    if (this.editingTriggerIndex >= 0) {
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; cursor: pointer;';
      deleteBtn.onclick = () => this.deleteTrigger();
      buttonContainer.appendChild(deleteBtn);
    }

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.cssText = 'padding: 5px 10px; background: #666; color: white; border: none; cursor: pointer;';
    backBtn.onclick = () => this.scene.enterDefaultMode();
    buttonContainer.appendChild(backBtn);

    container.appendChild(buttonContainer);

    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private saveTrigger(): void {
    const eventName = this.eventNameInput?.value.trim();
    if (!eventName) {
      alert('Please enter an event name');
      return;
    }

    if (this.selectedCells.size === 0) {
      alert('Please select at least one cell');
      return;
    }

    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    
    levelData.entities ??= [];

    const triggerCells = Array.from(this.selectedCells).map(cellKey => {
      const [col, row] = cellKey.split(',').map(Number);
      return { col, row };
    });

    const oneShotCheckbox = document.getElementById('oneShot') as HTMLInputElement;
    const oneShot = oneShotCheckbox?.checked ?? true;

    if (this.editingTriggerIndex >= 0) {
      const triggers = levelData.entities.filter(e => e.type === 'trigger');
      const triggerToEdit = triggers[this.editingTriggerIndex];
      if (triggerToEdit) {
        triggerToEdit.data = {
          eventToRaise: eventName,
          triggerCells,
          oneShot
        };
      }
    } else {
      const existingIds = levelData.entities.map(e => e.id);
      let idNum = 0;
      let newId = `trigger${idNum}`;
      while (existingIds.includes(newId)) {
        idNum++;
        newId = `trigger${idNum}`;
      }

      levelData.entities.push({
        id: newId,
        type: 'trigger',
        data: {
          eventToRaise: eventName,
          triggerCells,
          oneShot
        }
      });
    }
    
    this.scene.enterDefaultMode();
  }

  private deleteTrigger(): void {
    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    
    if (levelData.entities && this.editingTriggerIndex >= 0) {
      const triggers = levelData.entities.filter(e => e.type === 'trigger');
      const triggerToDelete = triggers[this.editingTriggerIndex];
      if (triggerToDelete) {
        levelData.entities = levelData.entities.filter(e => e.id !== triggerToDelete.id);
      }
    }
    
    this.scene.enterDefaultMode();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    // Check if click is on a Phaser UI element (buttons have depth 1000)
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    // If we hit any UI objects, ignore the grid click
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        const depth = (obj as unknown as { depth?: number }).depth;
        if (depth !== undefined && depth >= 1000) { // UI elements have high depth
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
