import Phaser from 'phaser';
import { ASSET_REGISTRY, type AssetKey } from './AssetRegistry';

/**
 * Preloads assets from the registry
 * @param scene - Phaser scene to load assets into
 * @param keys - Optional array of asset keys to load. If not provided, loads all assets
 */
export function preloadAssets(scene: Phaser.Scene, keys?: AssetKey[]): void {
  const keysToLoad: AssetKey[] = keys || ['player', 'bullet_default', 'bullet_default_shell', 'smoke', 'crosshair'];
  
  keysToLoad.forEach((key: AssetKey) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asset = ASSET_REGISTRY[key] as any;
    if (asset.type === 'spritesheet') {
      scene.load.spritesheet(asset.key, asset.path, asset.config);
    } else if (asset.type === 'image') {
      scene.load.image(asset.key, asset.path);
    } else if (asset.type === 'audio') {
      scene.load.audio(asset.key, asset.path);
    }
  });
}
