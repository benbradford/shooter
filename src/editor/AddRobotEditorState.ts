import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';

const ROBOT_SPRITE_FRAME = 0;
const ROBOT_SCALE = 4;

export class AddRobotEditorState extends EditorState {
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;
  private backButton: Phaser.GameObjects.Text | null = null;

  onEnter(): void {
    const gameScene = this.scene.scene.get('game');
    
    this.ghostSprite = gameScene.add.sprite(0, 0, 'floating_robot', ROBOT_SPRITE_FRAME);
    this.ghostSprite.setScale(ROBOT_SCALE);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(1000);

    this.backButton = this.createBackButton();

    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    
    if (this.ghostSprite) {
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }
    
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = null;
    }
  }

  onUpdate(_delta: number): void {
    // No update logic needed
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.ghostSprite) return;

    const gameScene = this.scene.scene.get('game') as Phaser.Scene & {
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);
    const cellWorld = grid.cellToWorld(cell.col, cell.row);
    
    const centerX = cellWorld.x + grid.cellSize / 2;
    const centerY = cellWorld.y + grid.cellSize / 2;

    this.ghostSprite.setPosition(centerX, centerY);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.ghostSprite) return;

    const gameScene = this.scene.scene.get('game') as Phaser.Scene & {
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
      addRobot: (col: number, row: number) => Entity;
    };
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);

    const robot = gameScene.addRobot(cell.col, cell.row);

    this.scene.enterEditRobotMode(robot);
  }
}
