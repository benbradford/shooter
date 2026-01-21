import Phaser from "phaser";
import type GameScene from "./GameScene";
import type { Grid } from "./utils/Grid";
import type { LevelData } from "./level/LevelLoader";
import { StateMachine } from "./utils/state/StateMachine";
import { DefaultEditorState } from "./editor/DefaultEditorState";
import { GridEditorState } from "./editor/GridEditorState";
import { ResizeEditorState } from "./editor/ResizeEditorState";
import { MoveEditorState } from "./editor/MoveEditorState";

export default class EditorScene extends Phaser.Scene {
  private stateMachine!: StateMachine;
  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private originalLevelData!: string;
  private readonly cameraSpeed = 400;

  constructor() {
    super({ key: 'EditorScene' });
  }

  create() {
    // Store original level data for change detection
    this.originalLevelData = JSON.stringify(this.getCurrentLevelData());

    // Get GameScene camera and stop following player
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    
    // Stop following player
    camera.stopFollow();
    
    // Store original bounds
    const grid = this.getGrid();
    const originalBounds = {
      x: 0,
      y: 0,
      width: grid.width * grid.cellSize,
      height: grid.height * grid.cellSize
    };
    
    // Remove bounds for editor (set to very large area)
    camera.setBounds(-10000, -10000, 20000, 20000);
    
    // Store for restoration
    this.registry.set('editorOriginalBounds', originalBounds);

    // Semi-transparent overlay
    this.overlay = this.add.rectangle(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.3
    );
    this.overlay.setOrigin(0, 0);
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(900);

    // Title
    const centerX = this.cameras.main.width / 2;
    this.title = this.add.text(centerX, 30, 'LEVEL EDITOR', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.title.setOrigin(0.5);
    this.title.setScrollFactor(0);
    this.title.setDepth(1000);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // ESC to exit
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.exitEditor();
    });

    // Initialize state machine
    this.stateMachine = new StateMachine({
      default: new DefaultEditorState(this),
      grid: new GridEditorState(this),
      resize: new ResizeEditorState(this),
      move: new MoveEditorState(this)
    }, 'default');
  }

  update(_time: number, delta: number): void {
    this.stateMachine.update(delta);
    this.handleCameraMovement(delta);
  }

  private handleCameraMovement(delta: number): void {
    const speed = this.cameraSpeed * (delta / 1000);
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      camera.scrollX -= speed;
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      camera.scrollX += speed;
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      camera.scrollY -= speed;
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      camera.scrollY += speed;
    }
  }

  getGrid(): Grid {
    const gameScene = this.scene.get('game') as GameScene;
    return gameScene.getGrid();
  }

  setCellData(col: number, row: number, data: { layer?: number; isTransition?: boolean }): void {
    const grid = this.getGrid();
    grid.setCell(col, row, data);
    grid.render(); // Force re-render to show changes
  }

  hasUnsavedChanges(): boolean {
    const current = JSON.stringify(this.getCurrentLevelData());
    return current !== this.originalLevelData;
  }

  private getCurrentLevelData(): LevelData {
    const grid = this.getGrid();
    const gameScene = this.scene.get('game') as GameScene;
    const cells = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && (cell.layer !== 0 || cell.isTransition)) {
          cells.push({
            col,
            row,
            layer: cell.layer === 0 ? undefined : cell.layer,
            isTransition: cell.isTransition ? cell.isTransition : undefined
          });
        }
      }
    }

    return {
      width: grid.width,
      height: grid.height,
      playerStart: gameScene.getPlayerStart(),
      cells
    };
  }

  saveLevel(): void {
    const levelData = this.getCurrentLevelData();
    const json = JSON.stringify(levelData, null, 2);
    
    // Log to console for easy copy/paste
    console.log('Level JSON (copy and paste into public/levels/default.json):');
    console.log(json);
    
    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'default.json';
    a.click();
    URL.revokeObjectURL(url);

    // Update original data
    this.originalLevelData = JSON.stringify(levelData);
    
    // Log instructions
    console.log('✓ Level saved to ~/Downloads/default.json');
    console.log('To update the game, run: ./scripts/update-levels.sh');
  }

  enterDefaultMode(): void {
    this.stateMachine.enter('default');
  }

  enterGridMode(): void {
    this.stateMachine.enter('grid');
  }

  enterResizeMode(): void {
    this.stateMachine.enter('resize');
  }

  enterMoveMode(): void {
    this.stateMachine.enter('move');
  }

  removeRow(row: number): void {
    const grid = this.getGrid();
    if (row < 0 || row >= grid.height || grid.height <= 10) return;
    
    // Shift all rows after this one up
    for (let r = row; r < grid.height - 1; r++) {
      for (let c = 0; c < grid.width; c++) {
        const nextCell = grid.getCell(c, r + 1);
        if (nextCell) {
          grid.setCell(c, r, {
            layer: nextCell.layer,
            isTransition: nextCell.isTransition
          });
        }
      }
    }
    
    // Remove last row by resizing
    grid.removeRow();
    grid.render();
  }

  removeColumn(col: number): void {
    const grid = this.getGrid();
    if (col < 0 || col >= grid.width || grid.width <= 10) return;
    
    // Shift all columns after this one left
    for (let c = col; c < grid.width - 1; c++) {
      for (let r = 0; r < grid.height; r++) {
        const nextCell = grid.getCell(c + 1, r);
        if (nextCell) {
          grid.setCell(c, r, {
            layer: nextCell.layer,
            isTransition: nextCell.isTransition
          });
        }
      }
    }
    
    // Remove last column by resizing
    grid.removeColumn();
    grid.render();
  }

  exitEditor(): void {
    // Restore camera bounds and following
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const bounds = this.registry.get('editorOriginalBounds') as { x: number; y: number; width: number; height: number };
    
    if (bounds) {
      camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    
    // Resume following player
    const player = gameScene.getPlayer();
    if (player) {
      camera.startFollow(player, true, 0.1, 0.1);
    }
    
    this.scene.resume('game');
    this.scene.stop();
  }
}
