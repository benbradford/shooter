import { EditorState } from './EditorState';

export class PortalEditorState extends EditorState {
  private selectedCell: { col: number; row: number } | null = null;
  private selectionRectangle: Phaser.GameObjects.Rectangle | null = null;

  onEnter(): void {
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
    if (this.selectionRectangle) {
      this.selectionRectangle.destroy();
      this.selectionRectangle = null;
    }
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
    `;

    const title = document.createElement('div');
    title.textContent = 'Portal Editor';
    title.style.marginBottom = '10px';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const instructions = document.createElement('div');
    instructions.textContent = 'Click a cell to place portal';
    instructions.style.marginBottom = '15px';
    instructions.style.fontSize = '12px';
    container.appendChild(instructions);

    const eventInput = document.createElement('input');
    eventInput.placeholder = 'Event name';
    eventInput.style.cssText = 'width: 200px; margin-bottom: 10px; padding: 5px;';
    eventInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(eventInput);
    container.appendChild(document.createElement('br'));

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
      if (!this.selectedCell || !eventInput.value || !levelInput.value || !colInput.value || !rowInput.value) {
        alert('Please select a cell and fill all fields');
        return;
      }

      const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => import('../systems/level/LevelLoader').LevelData };
      const levelData = gameScene.getLevelData();

      if (!levelData.triggers) levelData.triggers = [];
      if (!levelData.exits) levelData.exits = [];

      levelData.triggers.push({
        eventName: eventInput.value,
        triggerCells: [{ col: this.selectedCell.col, row: this.selectedCell.row }],
        oneShot: true
      });

      levelData.exits.push({
        eventName: eventInput.value,
        targetLevel: levelInput.value,
        targetCol: Number.parseInt(colInput.value),
        targetRow: Number.parseInt(rowInput.value)
      });

      const cell = levelData.cells.find(c => c.col === this.selectedCell!.col && c.row === this.selectedCell!.row);
      if (cell) {
        cell.backgroundTexture = 'dungeon_door';
      } else {
        levelData.cells.push({
          col: this.selectedCell.col,
          row: this.selectedCell.row,
          layer: 0,
          backgroundTexture: 'dungeon_door'
        });
      }

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
    
    this.selectedCell = { col: cell.col, row: cell.row };
    
    if (this.selectionRectangle) {
      this.selectionRectangle.destroy();
    }
    
    const worldPos = grid.cellToWorld(cell.col, cell.row);
    this.selectionRectangle = gameScene.add.rectangle(
      worldPos.x + grid.cellSize / 2,
      worldPos.y + grid.cellSize / 2,
      grid.cellSize,
      grid.cellSize
    );
    this.selectionRectangle.setStrokeStyle(3, 0xffff00);
    this.selectionRectangle.setFillStyle(0x000000, 0);
    this.selectionRectangle.setDepth(1000);
  };

  onUpdate(): void {}
}
