import Phaser from 'phaser';
import { SoundManager } from '../systems/SoundManager';
import { MusicManager } from '../systems/MusicManager';
import { loadAsset } from '../assets/AssetLoader';

const MIN_DISPLAY_MS = 1000;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.image('loading_bg', 'assets/concept/Loading.png');
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.image(width / 2, height / 2, 'loading_bg').setOrigin(0.5).setDisplaySize(width, height);

    void SoundManager.getInstance().initialize(this);

    const startTime = Date.now();

    loadAsset(this, 'btr_music');
    this.load.image('title_bg', 'assets/concept/title.png');
    this.load.once('complete', () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      this.time.delayedCall(remaining, () => {
        this.scene.start('title');
        MusicManager.getInstance().play(this, 'btr_music');
      });
    });
    this.load.start();
  }
}
