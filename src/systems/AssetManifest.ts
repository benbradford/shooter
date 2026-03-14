import type { LevelData } from './level/LevelLoader';
import { ASSET_REGISTRY, ASSET_GROUPS, type AssetKey, type AssetGroupKey } from '../assets/AssetRegistry';
import { getRequiredAssetGroups, getBackgroundTextures } from '../assets/AssetLoader';

type ManifestDiff = {
  readonly toLoad: AssetKey[];
  readonly toUnload: AssetKey[];
}

export class AssetManifest {
  static fromLevelData(levelData: LevelData): Set<AssetKey> {
    const assets = new Set<AssetKey>();

    this.addEntityAssets(assets, levelData);
    this.addBackgroundTextures(assets, levelData);
    this.addAnimatedTextures(assets, levelData);

    return assets;
  }

  private static addBackgroundTextures(assets: Set<AssetKey>, levelData: LevelData): void {
    const bgTextures = getBackgroundTextures(levelData);
    for (const tex of bgTextures) {
      assets.add(tex);
    }
  }

  private static addEntityAssets(assets: Set<AssetKey>, levelData: LevelData): void {
    const groups: AssetGroupKey[] = getRequiredAssetGroups(levelData);
    for (const group of groups) {
      const groupAssets = ASSET_GROUPS[group];
      if (groupAssets) {
        for (const key of groupAssets) {
          assets.add(key);
        }
      }
    }
  }

  private static addAnimatedTextures(assets: Set<AssetKey>, levelData: LevelData): void {
    if (!levelData.cells) return;

    for (const cell of levelData.cells) {
      if (cell.animatedTexture && cell.animatedTexture.spritesheet in ASSET_REGISTRY) {
        assets.add(cell.animatedTexture.spritesheet as AssetKey);
      }
    }
  }

  static diff(prev: Set<AssetKey>, next: Set<AssetKey>): ManifestDiff {
    return {
      toLoad: [...next].filter(k => !prev.has(k)),
      toUnload: [...prev].filter(k => !next.has(k))
    };
  }
}
