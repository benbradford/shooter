import Phaser from 'phaser';
import type GameScene from './GameScene';

const AVAILABLE_LEVELS = ['level1', 'default', 'dungeon1', 'grass_overworld1'];

export default class LevelSelectorScene extends Phaser.Scene {
  private readonly buttons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'LevelSelectorScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(900);

    const title = this.add.text(centerX, centerY - 150, 'SELECT LEVEL', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(1000);

    const startY = centerY - 50;
    const spacing = 60;

    AVAILABLE_LEVELS.forEach((levelName, index) => {
      const button = this.add.text(centerX, startY + index * spacing, levelName, {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 20, y: 10 }
      });
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
        console.log(`[LevelSelector] Selecting level: ${levelName}`);
        void this.selectLevel(levelName);
      });
    });

    const cancelButton = this.add.text(centerX, startY + AVAILABLE_LEVELS.length * spacing + 40, 'Cancel', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    cancelButton.setOrigin(0.5);
    cancelButton.setScrollFactor(0);
    cancelButton.setInteractive({ useHandCursor: true });
    cancelButton.setDepth(1000);
    this.buttons.push(cancelButton);

    cancelButton.on('pointerover', () => {
      cancelButton.setBackgroundColor('#555555');
    });
    cancelButton.on('pointerout', () => {
      cancelButton.setBackgroundColor('#333333');
    });
    cancelButton.on('pointerdown', () => {
      this.close();
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.close();
    });
  }

  private async selectLevel(levelName: string): Promise<void> {
    console.log(`[LevelSelector] Loading level: ${levelName}`);
    const gameScene = this.scene.get('game') as GameScene;
    await gameScene.loadLevel(levelName);
    console.log(`[LevelSelector] Level loaded, closing selector`);
    this.close();
  }

  private close(): void {
    this.scene.resume('game');
    this.scene.stop();
  }
}
