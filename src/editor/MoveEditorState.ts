import type { IState } from '../utils/state/IState';
import { EditorState } from './EditorState';
import type EditorScene from '../EditorScene';
import type GameScene from '../GameScene';

export class MoveEditorState extends EditorState {
  private backButton!: Phaser.GameObjects.Text;
  private isDragging = false;
  private highlight!: Phaser.GameObjects.Rectangle;

  constructor(scene: EditorScene) {
    super(scene);
  }

  onEnter(_prevState?: IState): void {
    this.backButton = this.createBackButton();

    // Create highlight rectangle in GameScene (so it scrolls with camera)
    const gameScene = this.scene.scene.get('game') as GameScene;
    const grid = this.scene.getGrid();
    this.highlight = gameScene.add.rectangle(0, 0, grid.cellSize, grid.cellSize, 0x00ff00, 0.3);
    this.highlight.setStrokeStyle(2, 0x00ff00);
    this.highlight.setDepth(950);

    // Setup drag handlers
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  onExit(_nextState?: IState): void {
    this.backButton.destroy();
    this.highlight.destroy();
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.isDragging = false;
  }

  onUpdate(_delta: number): void {
    if (!this.isDragging) {
      const gameScene = this.scene.scene.get('game') as GameScene;
      const player = gameScene.getPlayer();
      if (player) {
        this.highlight.setPosition(player.x, player.y);
      }
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const player = gameScene.getPlayer();
    if (player) {
      const dx = worldX - player.x;
      const dy = worldY - player.y;
      const distance = Math.hypot(dx, dy);
      
      if (distance < 64) {
        this.isDragging = true;
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    const gameScene = this.scene.scene.get('game') as GameScene;
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);
    const cellWorld = grid.cellToWorld(cell.col, cell.row);
    
    // Center of cell
    const centerX = cellWorld.x + grid.cellSize / 2;
    const centerY = cellWorld.y + grid.cellSize / 2;

    this.highlight.setPosition(centerX, centerY);
    gameScene.movePlayer(centerX, centerY);
  }

  private handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    this.isDragging = false;
  }
}
