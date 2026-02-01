import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';

export class ResizeEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private sizeText!: Phaser.GameObjects.Text;
  private selectedRow: number | null = null;
  private selectedCol: number | null = null;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  onEnter(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const buttonY = height - 50;
    const buttonSpacing = 120;
    const startX = 220;

    // Highlight graphics
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(998);

    // Back button (shared)
    this.buttons.push(this.createBackButton());

    // Add Row button
    this.createButton(startX, buttonY, 'Add Row', () => {
      this.scene.addRow();
    });

    // Add Column button
    this.createButton(startX + buttonSpacing, buttonY, 'Add Col', () => {
      this.scene.addColumn();
    });

    // Remove Row button
    this.createButton(startX + buttonSpacing * 2, buttonY, 'Remove Row', () => {
      if (this.selectedRow !== null) {
        this.scene.removeRow(this.selectedRow);
        this.selectedRow = null;
      }
    });

    // Remove Column button
    this.createButton(startX + buttonSpacing * 3, buttonY, 'Remove Col', () => {
      if (this.selectedCol !== null) {
        this.scene.removeColumn(this.selectedCol);
        this.selectedCol = null;
      }
    });

    // Grid size display
    const grid = this.scene.getGrid();
    this.sizeText = this.scene.add.text(width - 150, 30, `Grid: ${grid.width}x${grid.height}`, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    });
    this.sizeText.setOrigin(0.5);
    this.sizeText.setScrollFactor(0);
    this.sizeText.setDepth(1000);

    // Click to select row/column
    this.scene.input.on('pointerdown', this.handleSelection, this);
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
    this.sizeText.destroy();
    this.highlightGraphics.destroy();
    this.scene.input.off('pointerdown', this.handleSelection, this);
  }

  onUpdate(_delta: number): void {
    this.renderHighlight();
    
    // Update size text
    const grid = this.scene.getGrid();
    this.sizeText.setText(`Grid: ${grid.width}x${grid.height}`);
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.scene.add.text(x, y, text, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 12, y: 6 }
    });
    button.setOrigin(0.5);
    button.setScrollFactor(0);
    button.setInteractive({ useHandCursor: true });
    button.setDepth(1000);
    this.buttons.push(button);

    button.on('pointerover', () => button.setBackgroundColor('#555555'));
    button.on('pointerout', () => button.setBackgroundColor('#333333'));
    button.on('pointerdown', onClick);

    return button;
  }

  private handleSelection(pointer: Phaser.Input.Pointer): void {
    // Ignore clicks on UI buttons
    if (pointer.y > this.scene.cameras.main.height - 100) return;

    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const grid = this.scene.getGrid();
    const cell = grid.worldToCell(worldX, worldY);

    if (cell.col >= 0 && cell.col < grid.width && cell.row >= 0 && cell.row < grid.height) {
      // Simple selection: click selects that row AND column
      this.selectedRow = cell.row;
      this.selectedCol = cell.col;
    }
  }

  private renderHighlight(): void {
    this.highlightGraphics.clear();

    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    // Highlight selected row (orange)
    if (this.selectedRow !== null && this.selectedRow < grid.height) {
      const worldY = this.selectedRow * grid.cellSize;
      const screenY = worldY - camera.scrollY;
      
      this.highlightGraphics.fillStyle(0xff8800, 0.3);
      this.highlightGraphics.fillRect(
        -camera.scrollX,
        screenY,
        grid.width * grid.cellSize,
        grid.cellSize
      );
      
      this.highlightGraphics.lineStyle(3, 0xff8800, 1);
      this.highlightGraphics.strokeRect(
        -camera.scrollX,
        screenY,
        grid.width * grid.cellSize,
        grid.cellSize
      );
    }

    // Highlight selected column (orange)
    if (this.selectedCol !== null && this.selectedCol < grid.width) {
      const worldX = this.selectedCol * grid.cellSize;
      const screenX = worldX - camera.scrollX;
      
      this.highlightGraphics.fillStyle(0xff8800, 0.3);
      this.highlightGraphics.fillRect(
        screenX,
        -camera.scrollY,
        grid.cellSize,
        grid.height * grid.cellSize
      );
      
      this.highlightGraphics.lineStyle(3, 0xff8800, 1);
      this.highlightGraphics.strokeRect(
        screenX,
        -camera.scrollY,
        grid.cellSize,
        grid.height * grid.cellSize
      );
    }
  }
}
