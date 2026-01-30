import { EditorState } from './EditorState';
import type EditorScene from '../scenes/EditorScene';
import type GameScene from '../scenes/GameScene';

export class GridEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedCell: { col: number; row: number };
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly moveDelay = 150; // ms between moves when holding
  private lastMoveTime = 0;

  constructor(scene: EditorScene) {
    super(scene);
    // Initialize to center of grid
    const grid = scene.getGrid();
    this.selectedCell = {
      col: Math.floor(grid.width / 2),
      row: Math.floor(grid.height / 2)
    };
  }

  onEnter(): void {
    const height = this.scene.cameras.main.height;
    const buttonY = height - 50;
    const buttonSpacing = 100;
    const startX = 200;

    // Reset to center
    const grid = this.scene.getGrid();
    this.selectedCell = {
      col: Math.floor(grid.width / 2),
      row: Math.floor(grid.height / 2)
    };
    this.centerCameraOnSelectedCell();

    // Selection graphics
    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setDepth(999);

    // Setup keyboard input
    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = {
        W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Back button (shared)
    this.buttons.push(this.createBackButton());

    // Reset button
    this.createButton(startX, buttonY, 'Reset', () => {
      this.scene.setCellData(this.selectedCell.col, this.selectedCell.row, { layer: 0, isTransition: false });
    });

    // Layer buttons
    const layers = [-2, -1, 0, 1, 2];
    layers.forEach((layer, i) => {
      this.createButton(startX + buttonSpacing * (i + 1), buttonY, `Layer${layer}`, () => {
        this.scene.setCellData(this.selectedCell.col, this.selectedCell.row, { layer, isTransition: false });
      });
    });

    // Transition buttons
    this.createButton(startX + buttonSpacing * 7, buttonY, 'TransUp', () => {
      this.scene.setCellData(this.selectedCell.col, this.selectedCell.row, { isTransition: true });
    });

    this.createButton(startX + buttonSpacing * 8, buttonY, 'TransDown', () => {
      this.scene.setCellData(this.selectedCell.col, this.selectedCell.row, { isTransition: true });
    });
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
    this.selectionGraphics.destroy();
  }

  onUpdate(delta: number): void {
    this.handleKeyboardInput(delta);
    this.renderSelection();
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

  private handleKeyboardInput(_delta: number): void {
    const grid = this.scene.getGrid();
    const currentTime = Date.now();
    
    // Check if enough time has passed since last move
    if (currentTime - this.lastMoveTime < this.moveDelay) {
      return;
    }
    
    let moved = false;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      if (this.selectedCell.col > 0) {
        this.selectedCell.col--;
        moved = true;
      }
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      if (this.selectedCell.col < grid.width - 1) {
        this.selectedCell.col++;
        moved = true;
      }
    } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
      if (this.selectedCell.row > 0) {
        this.selectedCell.row--;
        moved = true;
      }
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      if (this.selectedCell.row < grid.height - 1) {
        this.selectedCell.row++;
        moved = true;
      }
    }

    if (moved) {
      this.lastMoveTime = currentTime;
      this.centerCameraOnSelectedCell();
    }
  }

  private centerCameraOnSelectedCell(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();
    
    const { x, y } = grid.cellToWorld(this.selectedCell.col, this.selectedCell.row);
    const centerX = x + grid.cellSize / 2;
    const centerY = y + grid.cellSize / 2;
    
    camera.scrollX = centerX - camera.width / 2;
    camera.scrollY = centerY - camera.height / 2;
  }

  private renderSelection(): void {
    this.selectionGraphics.clear();

    const grid = this.scene.getGrid();
    const { x, y } = grid.cellToWorld(this.selectedCell.col, this.selectedCell.row);
    const size = grid.cellSize;

    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    
    const screenX = x - camera.scrollX;
    const screenY = y - camera.scrollY;

    this.selectionGraphics.lineStyle(3, 0xffff00, 1);
    this.selectionGraphics.strokeRect(screenX, screenY, size, size);
  }
}
