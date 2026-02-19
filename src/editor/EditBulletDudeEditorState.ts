import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import type { IStateEnterProps } from '../systems/state/IState';

export class EditBulletDudeEditorState extends EditorState {
  private bulletDude: Entity | null = null;

  onEnter(props?: IStateEnterProps<void>): void {
    this.bulletDude = (props as IStateEnterProps<Entity> | undefined)?.data ?? null;
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
  }

  private createUI(): void {
    if (!this.bulletDude) return;

    const difficulty = this.bulletDude.get(DifficultyComponent);
    if (!difficulty) return;

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px; max-width: 400px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Edit BulletDude';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);


    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    backButton.onclick = () => this.scene.enterDefaultMode();
    this.uiContainer.appendChild(backButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    deleteButton.onclick = () => {
      if (this.bulletDude && confirm('Delete this entity?')) {
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        
        if (levelData.entities) {
          levelData.entities = levelData.entities.filter(e => e.id !== this.bulletDude!.id);
        }
        
        this.bulletDude.destroy();
        gameScene.resetScene();
        this.scene.enterDefaultMode();
      }
    };
    this.uiContainer.appendChild(deleteButton);

    document.body.appendChild(this.uiContainer);
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.bulletDude) return;

    const gameScene = this.scene.scene.get('game') as GameScene;
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        const gameObj = obj as unknown as { depth: number };
        if (gameObj.depth >= 1000) {
          return;
        }
      }
    }

    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    const transform = this.bulletDude.get(TransformComponent);
    if (!transform) return;

    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      this.scene.enterMoveMode(this.bulletDude, 'editBulletDude');
    }
  };

  protected destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = undefined;
    }
  }
}
