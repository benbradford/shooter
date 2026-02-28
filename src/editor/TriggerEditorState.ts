import { EditorState } from './EditorState';
import { Depth } from '../constants/DepthConstants';

const SELECTED_CELL_COLOR = 0xffffff;
const TRIGGER_CELL_COLOR = 0xffff00;

export class TriggerEditorState extends EditorState {
  private triggers: Array<{ id: string; eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean }> = [];
  private selectedIndex: number = -1;
  private readonly triggerCellRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private readonly selectedCells: Set<string> = new Set();
  private readonly selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private eventNameInput: HTMLInputElement | null = null;
  private oneShotCheckbox: HTMLInputElement | null = null;
  private isEditingTrigger: boolean = false;

  onEnter(): void {
    this.loadTriggers();
    this.createUI();
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearTriggerCellRectangles();
    this.clearSelectionRectangles();
  }

  private loadTriggers(): void {
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();
    
    this.triggers = [];
    for (const entity of levelData.entities ?? []) {
      if (entity.type === 'trigger') {
        const data = entity.data as { eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean };
        this.triggers.push({
          id: entity.id,
          eventToRaise: data.eventToRaise,
          triggerCells: data.triggerCells,
          oneShot: data.oneShot
        });
      }
    }
  }

  private createUI(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Triggers';
    title.style.marginTop = '0';
    container.appendChild(title);

    const list = document.createElement('div');
    list.style.marginBottom = '10px';
    
    if (this.triggers.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No triggers';
      empty.style.color = '#888';
      list.appendChild(empty);
    } else {
      this.triggers.forEach((trigger, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 10px;
          margin: 5px 0;
          background: ${this.selectedIndex === index ? '#444' : '#222'};
          border-radius: 4px;
          cursor: pointer;
        `;
        item.textContent = `${trigger.id} (${trigger.eventToRaise}) - ${trigger.triggerCells.length} cells`;
        item.onclick = () => {
          this.selectedIndex = index;
          this.showTriggerCells(trigger.triggerCells);
          this.destroyUI();
          this.createUI();
        };
        list.appendChild(item);
      });
    }
    container.appendChild(list);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';

    const addButton = document.createElement('button');
    addButton.textContent = 'Add New';
    addButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    addButton.onclick = () => this.showEditForm(null);
    buttonContainer.appendChild(addButton);

    if (this.selectedIndex >= 0) {
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
      editButton.onclick = () => this.showEditForm(this.triggers[this.selectedIndex]);
      buttonContainer.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.style.cssText = 'padding: 8px 16px; cursor: pointer; background: #c00;';
      deleteButton.onclick = () => this.deleteTrigger();
      buttonContainer.appendChild(deleteButton);
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    backButton.onclick = () => this.scene.enterDefaultMode();
    buttonContainer.appendChild(backButton);

    container.appendChild(buttonContainer);
    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private showTriggerCells(cells: Array<{ col: number; row: number }>): void {
    this.clearTriggerCellRectangles();
    
    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();
    
    for (const cell of cells) {
      const worldPos = grid.cellToWorld(cell.col, cell.row);
      const rect = gameScene.add.rectangle(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        grid.cellSize,
        grid.cellSize
      );
      rect.setStrokeStyle(3, TRIGGER_CELL_COLOR);
      rect.setFillStyle(TRIGGER_CELL_COLOR, 0.2);
      rect.setDepth(Depth.editor);
      this.triggerCellRectangles.set(`${cell.col},${cell.row}`, rect);
    }
  }

  private clearTriggerCellRectangles(): void {
    this.triggerCellRectangles.forEach(rect => rect.destroy());
    this.triggerCellRectangles.clear();
  }

  private showEditForm(existing: { id: string; eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean } | null): void {
    this.isEditingTrigger = true;
    this.selectedCells.clear();
    this.clearTriggerCellRectangles();
    this.clearSelectionRectangles();
    
    if (existing) {
      for (const cell of existing.triggerCells) {
        this.selectedCells.add(`${cell.col},${cell.row}`);
      }
    }
    
    this.destroyUI();
    this.createEditUI(existing);
    this.renderSelectionRectangles();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private createEditUI(existing: { id: string; eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean } | null): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 300px;
    `;

    const title = document.createElement('h3');
    title.textContent = existing ? 'Edit Trigger' : 'Add Trigger';
    title.style.marginTop = '0';
    container.appendChild(title);

    const eventLabel = document.createElement('div');
    eventLabel.textContent = 'Event Name:';
    eventLabel.style.marginBottom = '5px';
    container.appendChild(eventLabel);

    this.eventNameInput = document.createElement('input');
    this.eventNameInput.type = 'text';
    this.eventNameInput.placeholder = 'event_name';
    this.eventNameInput.value = existing?.eventToRaise ?? '';
    this.eventNameInput.style.cssText = `
      width: 100%;
      padding: 5px;
      margin-bottom: 10px;
      background: #333;
      color: white;
      border: 1px solid #666;
    `;
    this.eventNameInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(this.eventNameInput);

    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.marginBottom = '10px';
    
    this.oneShotCheckbox = document.createElement('input');
    this.oneShotCheckbox.type = 'checkbox';
    this.oneShotCheckbox.id = 'oneShot';
    this.oneShotCheckbox.checked = existing?.oneShot ?? true;
    
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'oneShot';
    checkboxLabel.textContent = ' One-shot trigger';
    checkboxLabel.style.cursor = 'pointer';
    
    checkboxContainer.appendChild(this.oneShotCheckbox);
    checkboxContainer.appendChild(checkboxLabel);
    container.appendChild(checkboxContainer);

    const instructions = document.createElement('div');
    instructions.textContent = 'Click grid cells to select trigger area';
    instructions.style.cssText = 'margin: 10px 0; font-size: 12px; color: #aaa;';
    container.appendChild(instructions);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 15px;';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = 'padding: 8px 16px; cursor: pointer; background: #0a0;';
    saveButton.onclick = () => {
      const eventName = this.eventNameInput?.value.trim() ?? '';
      if (!eventName) {
        alert('Event name is required');
        return;
      }
      if (this.selectedCells.size === 0) {
        alert('At least one trigger cell is required');
        return;
      }
      this.saveTrigger(existing?.id ?? null, eventName, this.oneShotCheckbox?.checked ?? true);
    };
    buttonContainer.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    cancelButton.onclick = () => {
      this.scene.input.off('pointerdown', this.handlePointerDown, this);
      this.clearSelectionRectangles();
      this.selectedCells.clear();
      this.isEditingTrigger = false;
      this.destroyUI();
      this.createUI();
    };
    buttonContainer.appendChild(cancelButton);

    container.appendChild(buttonContainer);
    document.body.appendChild(container);
    this.uiContainer = container;
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
      border.setStrokeStyle(3, SELECTED_CELL_COLOR);
      border.setFillStyle(0x000000, 0);
      border.setDepth(Depth.editor);
      this.selectionRectangles.set(cellKey, border);
    }
  }

  private clearSelectionRectangles(): void {
    this.selectionRectangles.forEach(rect => rect.destroy());
    this.selectionRectangles.clear();
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isEditingTrigger) return;
    
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        const depth = (obj as unknown as { depth?: number }).depth;
        if (depth && depth >= 1000) {
          return;
        }
      }
    }

    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    const grid = this.scene.getGrid();
    const cell = grid.worldToCell(worldX, worldY);
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
      border.setDepth(Depth.editor);
      this.selectionRectangles.set(cellKey, border);
    }
  };

  private saveTrigger(existingId: string | null, eventToRaise: string, oneShot: boolean): void {
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();

    levelData.entities ??= [];

    const triggerCells = Array.from(this.selectedCells).map(cellKey => {
      const [col, row] = cellKey.split(',').map(Number);
      return { col, row };
    });

    if (existingId) {
      const index = levelData.entities.findIndex((e) => e.id === existingId);
      if (index >= 0) {
        levelData.entities[index].data = { eventToRaise, triggerCells, oneShot };
      }
    } else {
      let id = 'trigger0';
      let counter = 0;
      while (levelData.entities.some((e) => e.id === id)) {
        counter++;
        id = `trigger${counter}`;
      }

      levelData.entities.push({
        id,
        type: 'trigger',
        data: { eventToRaise, triggerCells, oneShot }
      });
    }

    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.clearSelectionRectangles();
    this.selectedCells.clear();
    this.isEditingTrigger = false;
    this.destroyUI();
    this.loadTriggers();
    this.createUI();
  }

  private deleteTrigger(): void {
    if (this.selectedIndex < 0) return;

    const trigger = this.triggers[this.selectedIndex];
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();

    const index = levelData.entities?.findIndex((e) => e.id === trigger.id) ?? -1;
    if (index >= 0 && levelData.entities) {
      levelData.entities.splice(index, 1);
    }

    this.selectedIndex = -1;
    this.clearTriggerCellRectangles();
    this.destroyUI();
    this.loadTriggers();
    this.createUI();
  }
}
