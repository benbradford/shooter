import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';

const AVAILABLE_TEXTURES: string[] = ['door_closed', 'dungeon_door', 'dungeon_window', 'dungeon_key', 'stone_stairs', 'stone_wall', 'stone_floor', 'dungeon_floor', 'wall_torch', 'pillar'];

export class TextureEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedTexture: string | null = null;
  private textureButtons: Phaser.GameObjects.Container[] = [];
  private clearButton!: Phaser.GameObjects.Text;

  onEnter(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.buttons.push(this.createBackButton());

    const panelStartX = width - 200;
    const panelY = 80;
    const buttonHeight = 60;
    const maxButtonsPerColumn = Math.floor((height - panelY - 80) / buttonHeight);

    const title = this.scene.add.text(panelStartX, panelY - 30, 'Textures', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(1000);
    this.buttons.push(title);

    // Create texture buttons in columns
    AVAILABLE_TEXTURES.forEach((textureName, index) => {
      const col = Math.floor(index / maxButtonsPerColumn);
      const row = index % maxButtonsPerColumn;
      const buttonX = panelStartX - col * 200;
      const buttonY = panelY + row * buttonHeight;
      const container = this.createTextureButton(buttonX, buttonY, textureName);
      this.textureButtons.push(container);
    });

    // Clear button below last column
    const lastCol = Math.floor((AVAILABLE_TEXTURES.length - 1) / maxButtonsPerColumn);
    const lastRow = AVAILABLE_TEXTURES.length % maxButtonsPerColumn;
    const clearX = panelStartX - lastCol * 200;
    const clearY = panelY + lastRow * buttonHeight + 20;
    
    this.clearButton = this.scene.add.text(clearX, clearY, 'Clear', {
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
      this.selectedTexture = null;
      this.updateSelection();
    });

    // Click to apply texture
    this.scene.input.on('pointerdown', this.handleClick, this);
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
    if (pointer.y > this.scene.cameras.main.height - 100) return;
    if (pointer.x > this.scene.cameras.main.width - 250) return;

    const gameScene = this.scene.scene.get('game') as GameScene;
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
