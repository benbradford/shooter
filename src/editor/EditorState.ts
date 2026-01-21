import type { IState } from '../utils/state/IState';
import type EditorScene from '../EditorScene';

export abstract class EditorState implements IState {
  constructor(protected readonly scene: EditorScene) {}

  abstract onEnter(prevState?: IState): void;
  abstract onExit(nextState?: IState): void;
  abstract onUpdate(delta: number): void;

  protected createBackButton(): Phaser.GameObjects.Text {
    const height = this.scene.cameras.main.height;

    const backButton = this.scene.add.text(100, height - 50, 'Back', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    backButton.setOrigin(0.5);
    backButton.setScrollFactor(0);
    backButton.setInteractive({ useHandCursor: true });
    backButton.setDepth(1000);

    backButton.on('pointerover', () => {
      backButton.setBackgroundColor('#555555');
    });
    backButton.on('pointerout', () => {
      backButton.setBackgroundColor('#333333');
    });
    backButton.on('pointerdown', () => {
      this.scene.enterDefaultMode();
    });

    return backButton;
  }
}
