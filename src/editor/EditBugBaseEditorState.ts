import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { BugBaseDifficultyComponent } from '../bug/BugBaseDifficultyComponent';
import { getBugBaseDifficultyConfig, type BugBaseDifficulty } from '../bug/BugBaseDifficulty';

export class EditBugBaseEditorState extends EditorState {
  private bugBase: Entity | null = null;
  private buttons: Array<Phaser.GameObjects.Container | Phaser.GameObjects.Text> = [];

  onEnter(props?: { data?: unknown }): void {
    this.bugBase = (props?.data as Entity) ?? null;
    if (!this.bugBase) {
      this.scene.enterDefaultMode();
      return;
    }

    const backButton = this.createBackButton();
    this.buttons.push(backButton);

    this.createDifficultyButtons();

    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private createDifficultyButtons(): void {
    const width = this.scene.cameras.main.width;
    const centerX = width / 2;
    const startY = 200;

    const difficulties: BugBaseDifficulty[] = ['easy', 'medium', 'hard'];
    const difficultyComp = this.bugBase?.get(BugBaseDifficultyComponent);

    difficulties.forEach((diff, index) => {
      const y = startY + index * 60;
      const isSelected = difficultyComp?.difficulty === diff;
      
      const btn = this.createButton(centerX, y, diff.toUpperCase(), () => {
        this.setDifficulty(diff);
      });
      
      if (isSelected) {
        const bg = btn.getAt(0);
        if (bg instanceof Phaser.GameObjects.Rectangle) {
          bg.setFillStyle(0x00ff00);
        }
      }
      
      this.buttons.push(btn);
    });
  }

  private setDifficulty(difficulty: BugBaseDifficulty): void {
    if (!this.bugBase) return;

    const difficultyComp = this.bugBase.get(BugBaseDifficultyComponent);
    if (difficultyComp) {
      difficultyComp.difficulty = difficulty;
      const config = getBugBaseDifficultyConfig(difficulty);
      
      const health = this.bugBase.get(HealthComponent);
      if (health) {
        health.setMaxHealth(config.baseHealth);
        health.heal(config.baseHealth);
      }
    }

    this.onExit();
    this.onEnter({ data: this.bugBase });
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1000);

    const bg = this.scene.add.rectangle(0, 0, 200, 40, 0x333333);
    bg.setInteractive({ useHandCursor: true });
    
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff'
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0x555555));
    bg.on('pointerout', () => bg.setFillStyle(0x333333));
    bg.on('pointerdown', onClick);

    return container;
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

  onUpdate(_delta: number): void {}

  handlePointerDown(): void {
    if (!this.bugBase) return;

    const pointer = this.scene.input.activePointer;
    const gameScene = this.scene.scene.get('game') as Phaser.Scene & {
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    
    const worldX = pointer.x + gameScene.cameras.main.scrollX;
    const worldY = pointer.y + gameScene.cameras.main.scrollY;

    const transform = this.bugBase.get(TransformComponent);
    if (!transform) return;

    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      this.scene.enterMoveMode(this.bugBase, 'editBugBase');
    }
  }
}
