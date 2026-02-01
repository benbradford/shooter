import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';

const AVAILABLE_TEXTURES: string[] = ['door_closed'];

export class TextureEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedTexture: string | null = null;
  private textureButtons: Phaser.GameObjects.Container[] = [];

  onEnter(): void {
    const width = this.scene.cameras.main.width;

    this.buttons.push(this.createBackButton());

    // Texture selection panel
    const panelX = width - 200;
    const panelY = 150;

    const title = this.scene.add.text(panelX, panelY - 50, 'Textures', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(1000);
    this.buttons.push(title);

    // Create texture buttons
    AVAILABLE_TEXTURES.forEach((textureName, index) => {
      const buttonY = panelY + index * 80;
      const container = this.createTextureButton(panelX, buttonY, textureName);
      this.textureButtons.push(container);
    });

    // Clear button
    const clearButton = this.scene.add.text(panelX, panelY + AVAILABLE_TEXTURES.length * 80 + 20, 'Clear', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    });
    clearButton.setOrigin(0.5);
    clearButton.setScrollFactor(0);
    clearButton.setInteractive({ useHandCursor: true });
    clearButton.setDepth(1000);
    this.buttons.push(clearButton);

    clearButton.on('pointerover', () => clearButton.setBackgroundColor('#555555'));
    clearButton.on('pointerout', () => clearButton.setBackgroundColor('#333333'));
    clearButton.on('pointerdown', () => {
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

    const bg = this.scene.add.rectangle(0, 0, 180, 70, 0x333333);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const gameScene = this.scene.scene.get('game');
    const preview = gameScene.add.image(0, -10, textureName);
    preview.setDisplaySize(60, 60);
    preview.setScrollFactor(0);
    container.add(preview);

    const label = this.scene.add.text(0, 30, textureName, {
      fontSize: '12px',
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
        backgroundTexture: this.selectedTexture ?? undefined
      });
    }
  }
}
