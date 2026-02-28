import { EditorState } from './EditorState';
import { Depth } from '../constants/DepthConstants';
import type { Entity } from '../ecs/Entity';
import { createStalkingRobotEntity } from '../ecs/entities/robot/StalkingRobotEntity';
import type GameScene from '../scenes/GameScene';

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
    this.ghostSprite.setDepth(Depth.editor);

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

    const gameScene = this.scene.scene.get('game') as GameScene;
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);

    const robot = this.addRobot(gameScene, cell.col, cell.row);

    this.scene.enterEditRobotMode(robot);
  }

  private addRobot(gameScene: GameScene, col: number, row: number): Entity {
    const grid = this.scene.getGrid();
    const entityManager = gameScene.getEntityManager();

    const x = col * grid.cellSize + grid.cellSize / 2;
    const y = row * grid.cellSize + grid.cellSize / 2;

    const player = entityManager.getFirst('player');
    if (!player) {
      throw new Error('Player not found');
    }

    const waypoints = [
      { col: col - 1, row },
      { col: col + 1, row }
    ];

    // Default to medium difficulty
    const robot = createStalkingRobotEntity({
      scene: gameScene,
      x,
      y,
      grid,
      playerEntity: player,
      waypoints,
      difficulty: 'medium'
    });

    entityManager.add(robot);
    return robot;
  }
}
