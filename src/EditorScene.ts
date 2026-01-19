import Phaser from "phaser";

export default class EditorScene extends Phaser.Scene {
  private exitButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'EditorScene' });
  }

  create() {
    // Semi-transparent overlay
    const overlay = this.add.rectangle(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.5
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);

    // Editor UI container
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Title
    const title = this.add.text(centerX, centerY - 100, 'LEVEL EDITOR', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);

    // Exit button
    this.exitButton = this.add.text(centerX, centerY + 50, 'Exit Editor', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.exitButton.setOrigin(0.5);
    this.exitButton.setScrollFactor(0);
    this.exitButton.setInteractive({ useHandCursor: true });

    // Button hover effect
    this.exitButton.on('pointerover', () => {
      this.exitButton.setBackgroundColor('#555555');
    });

    this.exitButton.on('pointerout', () => {
      this.exitButton.setBackgroundColor('#333333');
    });

    // Exit editor on click
    this.exitButton.on('pointerdown', () => {
      this.exitEditor();
    });

    // Also exit with ESC key
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.exitEditor();
    });
  }

  private exitEditor(): void {
    // Resume the game scene (key is 'game', not 'GameScene')
    this.scene.resume('game');
    
    // Stop this editor scene
    this.scene.stop();
  }
}
