import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'title_bg');
    bg.setDisplaySize(width, height);

    const text = this.add.text(width / 2, height * 0.85, 'Touch To Start', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'sans-serif',
    });
    text.setOrigin(0.5);
    this.tweens.add({ targets: text, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

    this.cameras.main.fadeIn(500);

    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(500);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('profile_select');
      });
    });
  }
}
