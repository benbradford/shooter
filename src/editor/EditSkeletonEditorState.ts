import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import type { IStateEnterProps } from '../systems/state/IState';

export class EditSkeletonEditorState extends EditorState {
  private skeleton: Entity | null = null;

  onEnter(props?: IStateEnterProps<void>): void {
    this.skeleton = (props as IStateEnterProps<Entity> | undefined)?.data ?? null;
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
  }

  private createUI(): void {
    if (!this.skeleton) return;

    const difficulty = this.skeleton.get(DifficultyComponent);
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
    title.textContent = 'Edit Skeleton';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    const diffLabel = document.createElement('div');
    diffLabel.textContent = `Difficulty: ${difficulty.difficulty}`;
    diffLabel.style.marginTop = '10px';
    diffLabel.style.marginBottom = '10px';
    this.uiContainer.appendChild(diffLabel);

    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    difficulties.forEach(diff => {
      const button = document.createElement('button');
      button.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      button.style.cssText = `
        padding: 10px 20px;
        margin: 5px;
        background: ${difficulty.difficulty === diff ? '#4CAF50' : '#666'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
      `;
      button.onclick = () => {
        if (this.skeleton) {
          const diffComp = this.skeleton.get(DifficultyComponent);
          if (diffComp) {
            (diffComp as { difficulty: string }).difficulty = diff;
            
            // Update level data
            const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
            const levelData = gameScene.getLevelData();
            const entityDef = levelData.entities?.find(e => e.id === this.skeleton!.id);
            if (entityDef && entityDef.data) {
              (entityDef.data as { difficulty: string }).difficulty = diff;
            }
            
            this.destroyUI();
            this.createUI();
          }
        }
      };
      this.uiContainer?.appendChild(button);
    });

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
      if (this.skeleton && confirm('Delete this entity?')) {
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        
        // Remove from level data
        if (levelData.entities) {
          levelData.entities = levelData.entities.filter(e => e.id !== this.skeleton!.id);
        }
        
        // Destroy entity
        this.skeleton.destroy();
        
        // Reload and return to default
        gameScene.resetScene();
        this.scene.enterDefaultMode();
      }
    };
    this.uiContainer.appendChild(deleteButton);

    document.body.appendChild(this.uiContainer);
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.skeleton) return;

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

    const transform = this.skeleton.get(TransformComponent);
    if (!transform) return;

    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      this.scene.enterMoveMode(this.skeleton, 'editSkeleton');
    }
  };

  protected destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = undefined;
    }
  }
}
