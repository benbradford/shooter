import type Phaser from 'phaser';

const DEFAULT_VOLUME = 0.5;
const MUTED_STORAGE_KEY = 'music_muted';

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
 *
 * Mute state persists across sessions in localStorage. While muted, tracks are
 * still created and swapped on level transitions but held paused, so unmuting
 * resumes whatever the current level expects to be playing.
 */
export class MusicManager {
  private static instance: MusicManager;
  private currentKey: string | null = null;
  private currentSound: Phaser.Sound.BaseSound | null = null;
  private muted: boolean = localStorage.getItem(MUTED_STORAGE_KEY) === 'true';

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  getCurrentKey(): string | null {
    return this.currentKey;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Flips mute state and returns the new value. */
  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(muted: boolean): void {
    if (muted === this.muted) return;

    this.muted = muted;
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));

    if (!this.currentSound) return;

    if (muted) {
      this.currentSound.pause();
    } else if (this.currentSound.isPaused) {
      this.currentSound.resume();
    } else {
      this.currentSound.play();
    }
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
    this.currentKey = key;

    if (!this.muted) {
      this.currentSound.play();
    }
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
