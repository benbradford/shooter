import { ASSET_REGISTRY } from '../assets/AssetRegistry';

type SoundOptions = { volume?: number };

type NativeSoundPluginInterface = {
  preload(options: { sounds: Array<{ key: string; path: string }> }): Promise<void>;
  play(options: { key: string; volume: number }): Promise<void>;
};

export class SoundManager {
  private static instance: SoundManager;
  private game: Phaser.Game | null = null;
  private nativePlugin: NativeSoundPluginInterface | null = null;
  private useNative = false;
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style -- accessed externally via bracket notation
  get isInitialized(): boolean { return this._initialized; }
  private _initialized = false;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  async initialize(scene: Phaser.Scene): Promise<void> {
    this.game = scene.game;

    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        this.nativePlugin = registerPlugin<NativeSoundPluginInterface>('NativeSound');
        const sounds: Array<{ key: string; path: string }> = [];
        for (const asset of Object.values(ASSET_REGISTRY)) {
          if (asset.type === 'audio') {
            sounds.push({ key: asset.key, path: `public/${asset.path}` });
          }
        }
        await this.nativePlugin.preload({ sounds });
        this.useNative = true;
        console.log('[SoundManager] Using native SoundPool backend');
      } else {
        console.log('[SoundManager] Using Phaser audio backend');
      }
    } catch {
      console.log('[SoundManager] Using Phaser audio backend (Capacitor not available)');
    }

    this._initialized = true;
  }

  play(key: string, options?: SoundOptions): void {
    if (this.useNative && this.nativePlugin) {
      void this.nativePlugin.play({ key, volume: options?.volume ?? 1 }).catch(() => {
        this.game?.sound.play(key, options);
      });
      return;
    }

    if (this.game) {
      this.game.sound.play(key, options);
      return;
    }

    // Last resort: find game from global scope
    console.warn("Cannot find this.game");
    const game = (globalThis as unknown as { game?: Phaser.Game }).game;
    if (game) {
      this.game = game;
      game.sound.play(key, options);
    }
  }
}
