import type Phaser from 'phaser';
import type { LevelData } from './level/LevelLoader';
import { AssetManifest } from './AssetManifest';
import { TextureVerifier } from './TextureVerifier';
import { loadAsset } from '../assets/AssetLoader';
import { ASSET_REGISTRY } from '../assets/AssetRegistry';

const LOAD_TIMEOUT_MS = 10000;

type LoadResult = {
  readonly success: boolean;
  readonly failedAssets: string[];
}

export class AssetLoadCoordinator {
  static async loadLevelAssets(
    scene: Phaser.Scene,
    levelData: LevelData,
    onProgress?: (percent: number) => void
  ): Promise<LoadResult> {
    const requiredAssets = AssetManifest.fromLevelData(levelData);

    for (const assetKey of requiredAssets) {
      loadAsset(scene, assetKey);
    }

    if (onProgress) {
      scene.load.on('progress', (value: number) => {
        onProgress(Math.floor(value * 100));
      });
    }

    const loadSuccess = await this.waitForLoad(scene, LOAD_TIMEOUT_MS);
    if (!loadSuccess) {
      return { success: false, failedAssets: ['timeout'] };
    }

    const textureKeys: string[] = [];
    for (const key of requiredAssets) {
      if (key in ASSET_REGISTRY) {
        textureKeys.push(key);
      }
    }

    const verifyResult = TextureVerifier.verifyBatch(scene, textureKeys);
    if (verifyResult.invalid.length > 0) {
      return { success: false, failedAssets: verifyResult.invalid };
    }

    return { success: true, failedAssets: [] };
  }

  private static waitForLoad(scene: Phaser.Scene, timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (!scene.load.isLoading()) {
        scene.load.start();
      }

      if (!scene.load.isLoading()) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.error('[AssetLoadCoordinator] Load timed out');
        resolve(false);
      }, timeoutMs);

      scene.load.once('complete', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}
