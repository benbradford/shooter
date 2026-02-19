import { EditorState } from './EditorState';

export class EventChainerEditorState extends EditorState {
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
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Event Chainer';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    const instructions = document.createElement('div');
    instructions.textContent = 'Click a cell to place event chainer';
    instructions.style.marginBottom = '15px';
    instructions.style.fontSize = '12px';
    this.uiContainer.appendChild(instructions);

    const eventsLabel = document.createElement('label');
    eventsLabel.textContent = 'Events (one per line: eventName,delayMs):';
    eventsLabel.style.display = 'block';
    eventsLabel.style.marginBottom = '5px';
    this.uiContainer.appendChild(eventsLabel);

    const eventsTextarea = document.createElement('textarea');
    eventsTextarea.placeholder = 'sk1,0\nsk2,1000\nth1,500';
    eventsTextarea.rows = 5;
    eventsTextarea.style.cssText = 'width: 100%; padding: 5px; font-family: monospace; margin-bottom: 10px;';
    eventsTextarea.addEventListener('keydown', (e) => e.stopPropagation());
    this.uiContainer.appendChild(eventsTextarea);

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Event Chainer';
    addButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px 5px 5px 0;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    addButton.onclick = () => {
      if (!this.selectedCell) {
        alert('Please select a cell first');
        return;
      }

      const lines = eventsTextarea.value.trim().split('\n');
      const eventsToRaise: Array<{ event: string; delayMs: number }> = [];
      
      for (const line of lines) {
        const [event, delayStr] = line.split(',').map(s => s.trim());
        if (event && delayStr) {
          eventsToRaise.push({ event, delayMs: Number.parseInt(delayStr) || 0 });
        }
      }

      if (eventsToRaise.length === 0) {
        alert('Please enter at least one event');
        return;
      }

      const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
      const levelData = gameScene.getLevelData();
      
      if (!levelData.entities) {
        levelData.entities = [];
      }

      // Generate unique ID
      let idNum = 0;
      let newId = `eventchainer${idNum}`;
      while (levelData.entities.some(e => e.id === newId)) {
        idNum++;
        newId = `eventchainer${idNum}`;
      }

      levelData.entities.push({
        id: newId,
        type: 'eventchainer',
        data: {
          col: this.selectedCell.col,
          row: this.selectedCell.row,
          eventsToRaise
        }
      });

      gameScene.resetScene();
      this.scene.enterDefaultMode();
    };
    this.uiContainer.appendChild(addButton);

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    backButton.onclick = () => this.scene.enterDefaultMode();
    this.uiContainer.appendChild(backButton);

    document.body.appendChild(this.uiContainer);
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

  onUpdate(): void {
    // No update needed
  }
}
