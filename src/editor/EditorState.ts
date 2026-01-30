import type { IState, IStateEnterProps } from '../ecs/systems/state/IState';
import type EditorScene from '../scenes/EditorScene';

export abstract class EditorState<TData = void> implements IState<TData> {
  constructor(protected readonly scene: EditorScene) {}

  abstract onEnter(props?: IStateEnterProps<TData>): void;
  abstract onExit(nextState?: IState<TData>): void;
  onUpdate?(_delta: number): void {
    // Override if needed
  }

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
