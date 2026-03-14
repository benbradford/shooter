import { TextureReferenceTracker } from './TextureReferenceTracker';
import { AssetManager } from './AssetManager';

type LeakCheckResult = {
  readonly leaked: string[];
  readonly warnings: string[];
}

export class MemoryMonitor {
  static checkForLeaks(scene: Phaser.Scene): LeakCheckResult {
    const leaked: string[] = [];
    const warnings: string[] = [];
    const refTracker = TextureReferenceTracker.getInstance();

    const textureKeys = scene.textures.getTextureKeys()
      .filter(key => key !== '__DEFAULT' && key !== '__MISSING');

    for (const key of textureKeys) {
      const refCount = refTracker.getRefCount(key);
      if (refCount > 0 && !this.findSpritesUsingTexture(scene, key)) {
        leaked.push(key);
        warnings.push(`Texture '${key}' has ${refCount} refs but no sprites found`);
      }
    }

    const assetManager = AssetManager.getInstance();
    for (const key of textureKeys) {
      const deps = assetManager.getDependencies(key);
      for (const dep of deps) {
        if (dep.type === 'tileset' && !scene.textures.exists(dep.key)) {
          warnings.push(`Texture '${key}' has tileset dependency '${dep.key}' that is unloaded`);
        }
      }
    }

    if (leaked.length > 0 || warnings.length > 0) {
      console.warn(`[MemoryMonitor] Found ${leaked.length} leaks, ${warnings.length} warnings`);
      for (const w of warnings) {
        console.warn(`[MemoryMonitor] ${w}`);
      }
    }

    return { leaked, warnings };
  }

  private static findSpritesUsingTexture(scene: Phaser.Scene, key: string): boolean {
    // Check all active scenes, not just the current one
    const scenes = scene.game.scene.scenes.filter(s => s.scene.isActive());
    for (const s of scenes) {
      const children = s.children.list;
      for (const child of children) {
        if (child instanceof Phaser.GameObjects.Sprite || child instanceof Phaser.GameObjects.Image) {
          if (child.texture.key === key) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
