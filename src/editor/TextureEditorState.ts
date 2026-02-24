import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';

const AVAILABLE_TEXTURES: string[] = [
  'bush1',
  'door_closed',
  'dungeon_door',
  'dungeon_floor',
  'dungeon_key',
  'dungeon_platform',
  'dungeon_window',
  'fence1',
  'house1',
  'house2',
  'house3',
  'pillar',
  'rocks1',
  'rocks2',
  'rocks3',
  'rocks4',
  'rocks5',
  'rocks6',
  'stone_floor',
  'stone_stairs',
  'stone_wall',
  'tree1',
  'wall_torch'
];

export class TextureEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedTexture: string | null = null;
  private textureButtons: Phaser.GameObjects.Container[] = [];
  private clearButton!: Phaser.GameObjects.Text;
  private justClickedUI: boolean = false;
  private currentPage: number = 0;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;

  onEnter(): void {
    this.buttons.push(this.createBackButton());
    this.renderPage();
    this.scene.input.on('pointerdown', this.handleClick, this);
  }
  
  private renderPage(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Clear existing texture buttons
    this.textureButtons.forEach(btn => btn.destroy());
    this.textureButtons = [];
    if (this.clearButton) this.clearButton.destroy();
    if (this.leftArrow) this.leftArrow.destroy();
    if (this.rightArrow) this.rightArrow.destroy();

    const panelStartX = width - 200;
    const panelY = 80;
    const buttonHeight = 60;
    const maxButtonsPerColumn = Math.floor((height - panelY - 150) / buttonHeight);
    const TEXTURES_PER_PAGE = maxButtonsPerColumn * 3;

    const startIndex = this.currentPage * TEXTURES_PER_PAGE;
    const endIndex = Math.min(startIndex + TEXTURES_PER_PAGE, AVAILABLE_TEXTURES.length);
    const pageTextures = AVAILABLE_TEXTURES.slice(startIndex, endIndex);

    // Create texture buttons in columns (left to right)
    pageTextures.forEach((textureName, index) => {
      const col = Math.floor(index / maxButtonsPerColumn);
      const row = index % maxButtonsPerColumn;
      const buttonX = panelStartX - (2 - col) * 200; // Reverse column order
      const buttonY = panelY + row * buttonHeight;
      const container = this.createTextureButton(buttonX, buttonY, textureName);
      this.textureButtons.push(container);
    });

    // Clear button at bottom
    const clearY = height - 100;
    
    this.clearButton = this.scene.add.text(panelStartX, clearY, 'Clear', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    });
    this.clearButton.setOrigin(0.5);
    this.clearButton.setScrollFactor(0);
    this.clearButton.setInteractive({ useHandCursor: true });
    this.clearButton.setDepth(1000);
    this.buttons.push(this.clearButton);

    this.clearButton.on('pointerdown', () => {
      this.justClickedUI = true;
      this.selectedTexture = null;
      this.updateSelection();
    });
    
    // Pagination arrows below all content
    const totalPages = Math.ceil(AVAILABLE_TEXTURES.length / TEXTURES_PER_PAGE);
    
    if (totalPages > 1) {
      const arrowY = height - 50;
      const arrowX = width - 200;
      
      this.leftArrow = this.scene.add.text(arrowX - 50, arrowY, '<', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: this.currentPage > 0 ? '#333333' : '#666666',
        padding: { x: 10, y: 5 }
      });
      this.leftArrow.setOrigin(0.5);
      this.leftArrow.setScrollFactor(0);
      this.leftArrow.setDepth(1000);
      this.buttons.push(this.leftArrow);
      
      if (this.currentPage > 0) {
        this.leftArrow.setInteractive({ useHandCursor: true });
        this.leftArrow.on('pointerdown', () => {
          this.justClickedUI = true;
          this.currentPage--;
          this.renderPage();
        });
      }
      
      this.rightArrow = this.scene.add.text(arrowX + 50, arrowY, '>', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: this.currentPage < totalPages - 1 ? '#333333' : '#666666',
        padding: { x: 10, y: 5 }
      });
      this.rightArrow.setOrigin(0.5);
      this.rightArrow.setScrollFactor(0);
      this.rightArrow.setDepth(1000);
      this.buttons.push(this.rightArrow);
      
      if (this.currentPage < totalPages - 1) {
        this.rightArrow.setInteractive({ useHandCursor: true });
        this.rightArrow.on('pointerdown', () => {
          this.justClickedUI = true;
          this.currentPage++;
          this.renderPage();
        });
      }
      
      // Page indicator
      const pageText = this.scene.add.text(arrowX, arrowY, `${this.currentPage + 1}/${totalPages}`, {
        fontSize: '16px',
        color: '#ffffff'
      });
      pageText.setOrigin(0.5);
      pageText.setScrollFactor(0);
      pageText.setDepth(1000);
      this.buttons.push(pageText);
    }
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handleClick, this);
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
    this.textureButtons.forEach(container => container.destroy());
    this.textureButtons = [];
  }

  private createTextureButton(x: number, y: number, textureName: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, 180, 55, 0x333333);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const gameScene = this.scene.scene.get('game');
    const preview = gameScene.add.image(0, -8, textureName);
    preview.setDisplaySize(40, 40);
    preview.setScrollFactor(0);
    container.add(preview);

    const label = this.scene.add.text(0, 22, textureName, {
      fontSize: '10px',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    container.add(label);

    bg.on('pointerover', () => bg.setFillStyle(0x555555));
    bg.on('pointerout', () => {
      bg.setFillStyle(this.selectedTexture === textureName ? 0x00ff00 : 0x333333);
    });
    bg.on('pointerdown', () => {
      this.justClickedUI = true;
      this.selectedTexture = textureName;
      this.updateSelection();
    });

    container.setData('bg', bg);
    container.setData('textureName', textureName);

    return container;
  }

  private updateSelection(): void {
    this.textureButtons.forEach(container => {
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      const textureName = container.getData('textureName') as string;
      bg.setFillStyle(this.selectedTexture === textureName ? 0x00ff00 : 0x333333);
    });

    this.clearButton.setBackgroundColor(this.selectedTexture === null ? '#00ff00' : '#333333');
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    // Skip if just clicked UI
    if (this.justClickedUI) {
      this.justClickedUI = false;
      return;
    }
    
    // Check if clicking UI elements
    const gameScene = this.scene.scene.get('game') as GameScene;
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        const gameObj = obj as unknown as { depth?: number };
        if (gameObj.depth !== undefined && gameObj.depth >= 1000) {
          return; // UI element clicked
        }
      }
    }
    
    if (pointer.y > this.scene.cameras.main.height - 100) return;
    if (pointer.x > this.scene.cameras.main.width - 250) return;

    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);

    if (cell.col >= 0 && cell.col < grid.width && cell.row >= 0 && cell.row < grid.height) {
      this.scene.setCellData(cell.col, cell.row, {
        backgroundTexture: this.selectedTexture ?? ''
      });
    }
  }
}
