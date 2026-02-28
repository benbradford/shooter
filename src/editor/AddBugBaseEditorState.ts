import { EditorState } from './EditorState';
import { DEPTH_EDITOR } from '../constants/DepthConstants';
import type { Entity } from '../ecs/Entity';
import { createBugBaseEntity } from '../ecs/entities/bug/BugBaseEntity';
import type GameScene from '../scenes/GameScene';

export class AddBugBaseEditorState extends EditorState {
  private ghostSprite: Phaser.GameObjects.Sprite | null = null;
  private backButton: Phaser.GameObjects.Text | null = null;

  onEnter(): void {
    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();

    this.ghostSprite = gameScene.add.sprite(0, 0, 'bug_base', 0);
    this.ghostSprite.setDisplaySize(grid.cellSize, grid.cellSize);
    this.ghostSprite.setAlpha(0.6);
    this.ghostSprite.setDepth(DEPTH_EDITOR);

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

    const bugBase = this.addBugBase(gameScene, cell.col, cell.row);

    this.scene.enterEditBugBaseMode(bugBase);
  }

  private addBugBase(gameScene: GameScene, col: number, row: number): Entity {
    const grid = this.scene.getGrid();
    const entityManager = gameScene.getEntityManager();
    const levelData = gameScene.getLevelData();

    const player = entityManager.getFirst('player');
    if (!player) {
      throw new Error('Player not found');
    }

    const existingIds = (levelData.entities ?? []).map(e => e.id);
    const allIds = new Set([...existingIds, ...Array.from(entityManager.getAll()).map(e => e.id)]);

    let idNum = 0;
    let newId = `bug_base${idNum}`;
    while (allIds.has(newId)) {
      idNum++;
      newId = `bug_base${idNum}`;
    }

    const bugBase = createBugBaseEntity({
      scene: gameScene,
      col,
      row,
      grid,
      playerEntity: player,
      difficulty: 'medium',
      entityId: newId,
      entityManager: gameScene.getEntityManager(),
      onSpawnBug: (_spawnCol: number, _spawnRow: number) => {
        // Bug spawning handled by BugSpawnerComponent
      }
    });

    entityManager.add(bugBase);
    return bugBase;
  }
}
