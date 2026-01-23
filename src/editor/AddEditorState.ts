import { EditorState } from './EditorState';

export class AddEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const backButton = this.createBackButton();
    this.buttons.push(backButton);

    const robotButton = this.scene.add.text(centerX, centerY, 'Robot', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    robotButton.setOrigin(0.5);
    robotButton.setScrollFactor(0);
    robotButton.setInteractive({ useHandCursor: true });
    robotButton.setDepth(1000);
    this.buttons.push(robotButton);

    robotButton.on('pointerover', () => {
      robotButton.setBackgroundColor('#555555');
    });
    robotButton.on('pointerout', () => {
      robotButton.setBackgroundColor('#333333');
    });
    robotButton.on('pointerdown', () => {
      this.scene.enterAddRobotMode();
    });
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

  onUpdate(_delta: number): void {
    // No update logic needed
  }
}
