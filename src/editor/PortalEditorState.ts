import { EditorState } from './EditorState';
import { Depth } from '../constants/DepthConstants';

export class PortalEditorState extends EditorState {
  private readonly selectedCells: Set<string> = new Set();
  private readonly selectionRectangles: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  onEnter(): void {
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    this.clearSelectionRectangles();
  }

  private clearSelectionRectangles(): void {
    this.selectionRectangles.forEach(rect => rect.destroy());
    this.selectionRectangles.clear();
    this.selectedCells.clear();
  }

  private createUI(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const title = document.createElement('div');
    title.textContent = 'Portal Editor';
    title.style.marginBottom = '10px';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const instructions = document.createElement('div');
    instructions.textContent = 'Click cells to select portal area';
    instructions.style.marginBottom = '15px';
    instructions.style.fontSize = '12px';
    container.appendChild(instructions);

    const levelInput = document.createElement('input');
    levelInput.placeholder = 'Target level';
    levelInput.style.cssText = 'width: 200px; margin-bottom: 10px; padding: 5px;';
    levelInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(levelInput);
    container.appendChild(document.createElement('br'));

    const colInput = document.createElement('input');
    colInput.placeholder = 'Spawn col';
    colInput.type = 'number';
    colInput.style.cssText = 'width: 95px; margin-bottom: 10px; padding: 5px; margin-right: 10px;';
    colInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(colInput);

    const rowInput = document.createElement('input');
    rowInput.placeholder = 'Spawn row';
    rowInput.type = 'number';
    rowInput.style.cssText = 'width: 95px; margin-bottom: 10px; padding: 5px;';
    rowInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(rowInput);
    container.appendChild(document.createElement('br'));

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Portal';
    addButton.style.cssText = 'margin-right: 10px; padding: 5px 15px;';
    addButton.onclick = () => {
      if (this.selectedCells.size === 0 || !levelInput.value || !colInput.value || !rowInput.value) {
        alert('Please select cells and fill all fields');
        return;
      }

      const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
      const levelData = gameScene.getLevelData();

      if (!levelData.entities) levelData.entities = [];

      // Generate unique ID
      let idNum = 0;
      let newId = `exit${idNum}`;
      while (levelData.entities.some(e => e.id === newId)) {
        idNum++;
        newId = `exit${idNum}`;
      }

      const triggerCells = Array.from(this.selectedCells).map(cellKey => {
        const [col, row] = cellKey.split(',').map(Number);
        return { col, row };
      });

      levelData.entities.push({
        id: newId,
        type: 'exit',
        data: {
          targetLevel: levelInput.value,
          targetCol: Number.parseInt(colInput.value),
          targetRow: Number.parseInt(rowInput.value),
          triggerCells,
          oneShot: true
        }
      });

      gameScene.resetScene();
      this.scene.enterDefaultMode();
    };
    container.appendChild(addButton);

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = 'padding: 5px 15px;';
    backButton.onclick = () => this.scene.enterDefaultMode();
    container.appendChild(backButton);

    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const gameScene = this.scene.scene.get('game');
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        if ((obj as { depth?: number }).depth && (obj as { depth?: number }).depth! >= 1000) {
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
    
    // Toggle cell selection
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
      const rect = gameScene.add.rectangle(
        worldPos.x + grid.cellSize / 2,
        worldPos.y + grid.cellSize / 2,
        grid.cellSize,
        grid.cellSize
      );
      rect.setStrokeStyle(3, 0xffffff);
      rect.setFillStyle(0x000000, 0);
      rect.setDepth(Depth.editor);
      this.selectionRectangles.set(cellKey, rect);
    }
  };

  onUpdate(_delta: number): void {
    // Intentionally empty
  }
}
