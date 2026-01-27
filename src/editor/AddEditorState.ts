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

    const bugBaseButton = this.scene.add.text(centerX, centerY + 60, 'Bug Base', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    bugBaseButton.setOrigin(0.5);
    bugBaseButton.setScrollFactor(0);
    bugBaseButton.setInteractive({ useHandCursor: true });
    bugBaseButton.setDepth(1000);
    this.buttons.push(bugBaseButton);

    bugBaseButton.on('pointerover', () => {
      bugBaseButton.setBackgroundColor('#555555');
    });
    bugBaseButton.on('pointerout', () => {
      bugBaseButton.setBackgroundColor('#333333');
    });
    bugBaseButton.on('pointerdown', () => {
      this.scene.enterAddBugBaseMode();
    });
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

}
