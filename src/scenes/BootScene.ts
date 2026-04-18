import Phaser from 'phaser';

const MIN_DISPLAY_MS = 1000;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.audio('btr_music', 'assets/music/btr.mp3');
    this.load.image('title_bg', 'assets/concept/title.png');
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px', color: '#888888', fontFamily: 'sans-serif',
    }).setOrigin(0.5);



    this.time.delayedCall(MIN_DISPLAY_MS, () => {
      this.scene.start('title');
      this.sound.play('btr_music', { loop: true, volume: 0.5 });
    });
  }
}
