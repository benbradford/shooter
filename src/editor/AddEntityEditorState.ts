import { EditorState } from './EditorState';
import type { EntityType } from '../systems/level/LevelLoader';

const ENTITY_TYPES: Array<{ type: EntityType; label: string }> = [
  { type: 'skeleton', label: 'Skeleton' },
  { type: 'thrower', label: 'Thrower' },
  { type: 'stalking_robot', label: 'Robot' },
  { type: 'bug_base', label: 'Bug Base' },
  { type: 'bullet_dude', label: 'Bullet Dude' },
  { type: 'trigger', label: 'Trigger' },
  { type: 'exit', label: 'Exit/Portal' },
  { type: 'eventchainer', label: 'Event Chainer' }
];

export class AddEntityEditorState extends EditorState {
  private selectedType: EntityType | null = null;
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;

  onEnter(): void {
    this.createUI();
  }

  onExit(): void {
    this.destroyUI();
    
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
    
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    
    this.selectedType = null;
  }

  private createUI(): void {
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
    `;

    const title = document.createElement('div');
    title.textContent = 'Add Entity';
    title.style.marginBottom = '15px';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const select = document.createElement('select');
    select.style.cssText = 'width: 200px; padding: 5px; margin-bottom: 15px;';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select entity type...';
    select.appendChild(defaultOption);
    
    for (const { type, label } of ENTITY_TYPES) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = label;
      select.appendChild(option);
    }
    
    select.onchange = () => {
      this.selectedType = select.value as EntityType || null;
      if (this.selectedType) {
        this.createGhostSprite();
      }
    };
    
    container.appendChild(select);
    container.appendChild(document.createElement('br'));

    const instructions = document.createElement('div');
    instructions.textContent = 'Select type, then click to place';
    instructions.style.fontSize = '12px';
    instructions.style.marginBottom = '15px';
    container.appendChild(instructions);

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = 'padding: 5px 15px;';
    backButton.onclick = () => this.scene.enterDefaultMode();
    container.appendChild(backButton);

    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private createGhostSprite(): void {
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
    }

    const gameScene = this.scene.scene.get('game');
    
    let texture = 'bug_base';
    if (this.selectedType === 'skeleton') texture = 'skeleton';
    else if (this.selectedType === 'thrower') texture = 'thrower';
    else if (this.selectedType === 'stalking_robot') texture = 'attacker';
    else if (this.selectedType === 'bullet_dude') texture = 'attacker';
    
    this.ghostSprite = gameScene.add.sprite(0, 0, texture, 0);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(1000);
    this.ghostSprite.setScale(2);
    
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.ghostSprite) return;
    
    const gameScene = this.scene.scene.get('game');
    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;
    
    const grid = this.scene.getGrid();
    const cell = grid.worldToCell(worldX, worldY);
    const worldPos = grid.cellToWorld(cell.col, cell.row);
    
    this.ghostSprite.setPosition(
      worldPos.x + grid.cellSize / 2,
      worldPos.y + grid.cellSize / 2
    );
  };

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.selectedType) return;
    
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
    
    this.placeEntity(cell.col, cell.row);
  };

  private placeEntity(col: number, row: number): void {
    if (!this.selectedType) return;
    
    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const levelData = gameScene.getLevelData();
    const entityManager = gameScene.getEntityManager();
    
    // Generate unique ID
    const existingIds = (levelData.entities ?? []).map(e => e.id);
    const allIds = [...existingIds, ...Array.from(entityManager.getAll()).map(e => e.id)];
    
    let idNum = 0;
    let newId = `${this.selectedType}${idNum}`;
    while (allIds.includes(newId)) {
      idNum++;
      newId = `${this.selectedType}${idNum}`;
    }
    
    // Add to level data
    if (!levelData.entities) {
      levelData.entities = [];
    }
    
    const newEntity: import('../systems/level/LevelLoader').LevelEntity = {
      id: newId,
      type: this.selectedType,
      data: {
        col,
        row,
        difficulty: 'medium',
        ...(this.selectedType === 'stalking_robot' ? { waypoints: [{ col, row }] } : {})
      }
    };
    
    levelData.entities.push(newEntity);
    
    // Reload scene to spawn entity
    gameScene.resetScene();
    
    // Stay in add mode
    this.scene.enterAddMode();
  }

  onUpdate(_delta: number): void {
    // Intentionally empty
  }
}
