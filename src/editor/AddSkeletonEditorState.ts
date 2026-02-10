import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';

export class AddSkeletonEditorState extends EditorState {
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;
  private readonly difficulty: 'easy' | 'medium' | 'hard' = 'easy';

  onEnter(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const grid = this.scene.getGrid();

    this.ghostSprite = gameScene.add.sprite(0, 0, 'skeleton', 0);
    this.ghostSprite.setDisplaySize(grid.cellSize, grid.cellSize);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(1000);

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
  }

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.ghostSprite) return;

    const gameScene = this.scene.scene.get('game');
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    const cell = grid.worldToCell(worldX, worldY);
    const worldPos = grid.cellToWorld(cell.col, cell.row);
    const centerX = worldPos.x + grid.cellSize / 2;
    const centerY = worldPos.y + grid.cellSize / 2;

    this.ghostSprite.setPosition(centerX, centerY);
  };

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    const cell = grid.worldToCell(worldX, worldY);

    const levelData = gameScene.getLevelData();
    levelData.skeletons ??= [];

    levelData.skeletons.push({
      col: cell.col,
      row: cell.row,
      difficulty: this.difficulty
    });

    gameScene.resetScene();

    const skeletons = gameScene.entityManager.getByType('skeleton');
    const newSkeleton = skeletons[skeletons.length - 1];

    this.scene.enterEditSkeletonMode(newSkeleton);
  };
}
