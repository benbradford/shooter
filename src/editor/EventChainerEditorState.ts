import { EditorState } from './EditorState';
import { DEPTH_EDITOR } from '../constants/DepthConstants';

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
    title.textContent = 'Event Chainers';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    // List existing chainers
    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    const chainers = (levelData.entities ?? []).filter(e => e.type === 'eventchainer');

    if (chainers.length > 0) {
      const listTitle = document.createElement('div');
      listTitle.textContent = 'Existing Event Chainers:';
      listTitle.style.fontWeight = 'bold';
      listTitle.style.marginBottom = '10px';
      this.uiContainer.appendChild(listTitle);

      chainers.forEach(chainer => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px; margin: 5px 0; background: #333; border-radius: 4px; cursor: pointer;';
        item.textContent = `${chainer.id} (${(chainer.data as { eventsToRaise: unknown[] }).eventsToRaise.length} events)`;
        
        item.onclick = () => {
          this.destroyUI();
          this.createEditUI(chainer);
        };
        
        if (this.uiContainer) {
          this.uiContainer.appendChild(item);
        }
      });

      const separator = document.createElement('hr');
      separator.style.margin = '15px 0';
      if (this.uiContainer) {
        this.uiContainer.appendChild(separator);
      }
    }

    // Add new chainer section
    const addTitle = document.createElement('div');
    addTitle.textContent = 'Add New Event Chainer:';
    addTitle.style.fontWeight = 'bold';
    addTitle.style.marginBottom = '10px';
    this.uiContainer.appendChild(addTitle);

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
    addButton.onclick = () => this.addChainer(eventsTextarea.value);
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

  private createEditUI(chainer: import('../systems/level/LevelLoader').LevelEntity): void {
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
    title.textContent = `Edit ${chainer.id}`;
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    const eventsLabel = document.createElement('label');
    eventsLabel.textContent = 'Events (one per line: eventName,delayMs):';
    eventsLabel.style.display = 'block';
    eventsLabel.style.marginBottom = '5px';
    this.uiContainer.appendChild(eventsLabel);

    const eventsTextarea = document.createElement('textarea');
    const eventsToRaise = (chainer.data as { eventsToRaise: Array<{ event: string; delayMs: number }> }).eventsToRaise;
    eventsTextarea.value = eventsToRaise.map(e => `${e.event},${e.delayMs}`).join('\n');
    eventsTextarea.rows = 5;
    eventsTextarea.style.cssText = 'width: 100%; padding: 5px; font-family: monospace; margin-bottom: 10px;';
    eventsTextarea.addEventListener('keydown', (e) => e.stopPropagation());
    this.uiContainer.appendChild(eventsTextarea);

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px 5px 5px 0;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    saveButton.onclick = () => this.saveChainer(chainer.id, eventsTextarea.value);
    this.uiContainer.appendChild(saveButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    deleteButton.onclick = () => this.deleteChainer(chainer.id);
    this.uiContainer.appendChild(deleteButton);

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
    backButton.onclick = () => {
      this.destroyUI();
      this.createUI();
    };
    this.uiContainer.appendChild(backButton);

    document.body.appendChild(this.uiContainer);
  }

  private addChainer(eventsText: string): void {
    if (!this.selectedCell) {
      alert('Please select a cell first');
      return;
    }

    const lines = eventsText.trim().split('\n');
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
  }

  private saveChainer(chainerId: string, eventsText: string): void {
    const lines = eventsText.trim().split('\n');
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
    const chainer = levelData.entities?.find(e => e.id === chainerId);
    
    if (chainer && chainer.data) {
      (chainer.data as { eventsToRaise: Array<{ event: string; delayMs: number }> }).eventsToRaise = eventsToRaise;
    }

    gameScene.resetScene();
    this.scene.enterDefaultMode();
  }

  private deleteChainer(chainerId: string): void {
    if (!confirm('Delete this event chainer?')) return;

    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    
    if (levelData.entities) {
      levelData.entities = levelData.entities.filter(e => e.id !== chainerId);
    }

    const entityManager = gameScene.getEntityManager();
    const entity = Array.from(entityManager.getAll()).find(e => e.id === chainerId);
    if (entity) {
      entity.destroy();
    }

    gameScene.resetScene();
    this.scene.enterDefaultMode();
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
    this.selectionRectangle.setDepth(DEPTH_EDITOR);
  };

  onUpdate(): void {
    // No update needed
  }
}
