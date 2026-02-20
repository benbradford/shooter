import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { getBugBaseDifficultyConfig } from '../ecs/entities/bug/BugBaseDifficulty';
import type { EnemyDifficulty } from '../constants/EnemyDifficulty';

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

    const deleteButton = this.createButton(this.scene.cameras.main.width / 2, 100, 'Delete', () => {
      if (this.bugBase && confirm('Delete this entity?')) {
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        
        if (levelData.entities && this.bugBase) {
          const bugBaseId = this.bugBase.id;
          levelData.entities = levelData.entities.filter(e => e.id !== bugBaseId);
          this.bugBase.destroy();
        }
        
        gameScene.resetScene();
        this.scene.enterDefaultMode();
      }
    });
    const deleteBg = deleteButton.getAt(0);
    if (deleteBg instanceof Phaser.GameObjects.Rectangle) {
      deleteBg.setFillStyle(0xd32f2f);
    }
    this.buttons.push(deleteButton);

    this.createDifficultyButtons();

    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private createDifficultyButtons(): void {
    const width = this.scene.cameras.main.width;
    const centerX = width / 2;
    const startY = 200;

    const difficulties: EnemyDifficulty[] = ['easy', 'medium', 'hard'];
    const difficultyComp = this.bugBase?.get(DifficultyComponent<EnemyDifficulty>);

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

  private setDifficulty(difficulty: EnemyDifficulty): void {
    if (!this.bugBase) return;

    const difficultyComp = this.bugBase.get(DifficultyComponent<EnemyDifficulty>);
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
