import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import type { IStateEnterProps } from '../systems/state/IState';

export class EditThrowerEditorState extends EditorState {
  private thrower: Entity | null = null;

  onEnter(props?: IStateEnterProps<void>): void {
    this.thrower = (props as IStateEnterProps<Entity> | undefined)?.data ?? null;
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.destroyUI();
  }

  private createUI(): void {
    if (!this.thrower) return;

    const difficulty = this.thrower.get(DifficultyComponent);
    if (!difficulty) return;

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Edit Thrower';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    // ID input
    const idLabel = document.createElement('label');
    idLabel.textContent = 'ID (optional, for spawners):';
    idLabel.style.display = 'block';
    idLabel.style.marginTop = '10px';
    this.uiContainer.appendChild(idLabel);

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.value = (this.thrower as { throwerId?: string }).throwerId ?? '';
    idInput.style.cssText = `
      width: 100%;
      padding: 5px;
      margin: 5px 0;
      font-family: monospace;
    `;
    idInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.uiContainer.appendChild(idInput);

    // Difficulty buttons
    const diffLabel = document.createElement('div');
    diffLabel.textContent = `Difficulty: ${difficulty.difficulty}`;
    diffLabel.style.marginTop = '20px';
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
        if (this.thrower) {
          const diffComp = this.thrower.get(DifficultyComponent);
          if (diffComp) {
            (diffComp as { difficulty: string }).difficulty = diff;
          }
          this.scene.enterEditThrowerMode(this.thrower);
        }
      };
      this.uiContainer?.appendChild(button);
    });

    // Save ID button
    const saveIdButton = document.createElement('button');
    saveIdButton.textContent = 'Save ID';
    saveIdButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
      display: block;
    `;
    saveIdButton.onclick = () => {
      if (this.thrower) {
        (this.thrower as { throwerId?: string }).throwerId = idInput.value.trim() || undefined;
        alert('ID saved');
      }
    };
    this.uiContainer.appendChild(saveIdButton);

    // Back button
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

    document.body.appendChild(this.uiContainer);
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.thrower) return;

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

    const transform = this.thrower.get(TransformComponent);
    if (!transform) return;

    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      this.scene.enterMoveMode(this.thrower, 'editThrower');
    }
  };

  protected destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = undefined;
    }
  }
}
