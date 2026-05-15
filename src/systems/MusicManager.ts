import type Phaser from 'phaser';

const DEFAULT_VOLUME = 0.5;

type MusicOptions = {
  volume?: number;
  loop?: boolean;
};

/**
 * Singleton that manages background music playback.
 *
 * Tracks the currently playing music key. Calling `play()` with the same key
 * is a no-op so music continues seamlessly across level transitions.
 * Passing `null` stops any current music.
 */
export class MusicManager {
  private static instance: MusicManager;
  private currentKey: string | null = null;
  private currentSound: Phaser.Sound.BaseSound | null = null;

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  getCurrentKey(): string | null {
    return this.currentKey;
  }

  /**
   * Play `key` if not already playing it. Pass `null` to stop all music.
   * Requires the audio asset to be loaded into the scene's cache before calling.
   */
  play(scene: Phaser.Scene, key: string | null, options?: MusicOptions): void {
    if (key === this.currentKey) return;

    this.stop();

    if (!key) return;

    if (!scene.cache.audio.exists(key)) {
      console.warn(`[MusicManager] Audio key not loaded: ${key}`);
      return;
    }

    this.currentSound = scene.sound.add(key, {
      loop: options?.loop ?? true,
      volume: options?.volume ?? DEFAULT_VOLUME,
    });
    this.currentSound.play();
    this.currentKey = key;
  }

  stop(): void {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.destroy();
      this.currentSound = null;
    }
    this.currentKey = null;
  }
}
