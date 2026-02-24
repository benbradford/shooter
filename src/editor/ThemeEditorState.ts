import { EditorState } from './EditorState';

export class ThemeEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const themes = ['dungeon', 'swamp', 'grass', 'wilds'];
    const buttonSpacing = 80;

    themes.forEach((theme, index) => {
      const button = this.scene.add.text(
        centerX,
        centerY - buttonSpacing + index * buttonSpacing,
        theme.charAt(0).toUpperCase() + theme.slice(1),
        {
          fontSize: '32px',
          color: '#ffffff',
          backgroundColor: '#333333',
          padding: { x: 30, y: 15 }
        }
      );
      button.setOrigin(0.5);
      button.setScrollFactor(0);
      button.setInteractive({ useHandCursor: true });
      button.setDepth(1000);
      this.buttons.push(button);

      button.on('pointerover', () => {
        button.setBackgroundColor('#555555');
      });
      button.on('pointerout', () => {
        button.setBackgroundColor('#333333');
      });
      button.on('pointerdown', () => {
        this.scene.setTheme(theme as 'dungeon' | 'swamp');
        this.scene.enterDefaultMode();
      });
    });

    const backButton = this.scene.add.text(centerX, centerY + buttonSpacing * 2, 'Back', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    backButton.setOrigin(0.5);
    backButton.setScrollFactor(0);
    backButton.setInteractive({ useHandCursor: true });
    backButton.setDepth(1000);
    this.buttons.push(backButton);

    backButton.on('pointerover', () => {
      backButton.setBackgroundColor('#555555');
    });
    backButton.on('pointerout', () => {
      backButton.setBackgroundColor('#333333');
    });
    backButton.on('pointerdown', () => {
      this.scene.enterDefaultMode();
    });
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }
}
