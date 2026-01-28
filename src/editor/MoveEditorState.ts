import { EditorState } from './EditorState';
import type GameScene from '../GameScene';
import type { Entity } from '../ecs/Entity';
import type { IStateEnterProps } from '../utils/state/IState';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';

export type MoveEditorStateProps = {
  entity: Entity;
  returnState?: string;
}

export class MoveEditorState extends EditorState<MoveEditorStateProps> {
  private backButton!: Phaser.GameObjects.Text;
  private isDragging = false;
  private highlight!: Phaser.GameObjects.Rectangle;
  private entity: Entity | null = null;
  private returnState: string = 'default';

  onEnter(props?: IStateEnterProps<MoveEditorStateProps>): void {
    // Get entity and return state from props
    if (!props?.data) {
      throw new Error('MoveEditorState requires props.data with entity');
    }

    this.entity = props.data.entity;
    this.returnState = props.data.returnState ?? 'default';

    // Create custom back button
    const height = this.scene.cameras.main.height;
    this.backButton = this.scene.add.text(100, height - 50, 'Back', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.backButton.setOrigin(0.5);
    this.backButton.setScrollFactor(0);
    this.backButton.setInteractive({ useHandCursor: true });
    this.backButton.setDepth(1000);

    this.backButton.on('pointerover', () => {
      this.backButton.setBackgroundColor('#555555');
    });
    this.backButton.on('pointerout', () => {
      this.backButton.setBackgroundColor('#333333');
    });
    this.backButton.on('pointerdown', () => {
      if (this.returnState === 'editRobot' && this.entity) {
        this.scene.enterEditRobotMode(this.entity);
      } else {
        this.scene.enterDefaultMode();
      }
    });

    // Create highlight rectangle in GameScene (so it scrolls with camera)
    const gameScene = this.scene.scene.get('game') as GameScene;
    const grid = this.scene.getGrid();
    this.highlight = gameScene.add.rectangle(0, 0, grid.cellSize, grid.cellSize, 0x00ff00, 0.3);
    this.highlight.setStrokeStyle(2, 0x00ff00);
    this.highlight.setDepth(950);

    // Start dragging immediately
    this.isDragging = true;

    // Setup drag handlers
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  onExit(): void {
    this.backButton.destroy();
    this.highlight.destroy();
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.isDragging = false;
    this.entity = null;
  }

  onUpdate(_delta: number): void {
    if (!this.isDragging && this.entity) {
      const transform = this.entity.get(TransformComponent);
      if (transform) {
        this.highlight.setPosition(transform.x, transform.y);
      }
    }
  }

  private handlePointerDown(_pointer: Phaser.Input.Pointer): void {
    // Start dragging again
    this.isDragging = true;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.entity) return;

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
    
    // Move entity
    const transform = this.entity.get(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (transform && sprite) {
      transform.x = centerX;
      transform.y = centerY;
      sprite.sprite.setPosition(centerX, centerY);
    }
  }

  private handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    this.isDragging = false;
  }
}
