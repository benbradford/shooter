export type DependencyType = 'animation' | 'tileset';

export type Dependency = {
  type: DependencyType;
  key: string;
}

export class AssetManager {
  private static instance: AssetManager;
  private readonly dependencies: Map<string, Dependency[]> = new Map();

  // Private constructor for singleton
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  registerDependency(assetKey: string, dependencyType: DependencyType, dependencyKey: string): void {
    if (!this.dependencies.has(assetKey)) {
      this.dependencies.set(assetKey, []);
    }

    const deps = this.dependencies.get(assetKey)!;
    if (deps.some(d => d.key === dependencyKey)) {
      return;
    }

    deps.push({ type: dependencyType, key: dependencyKey });
  }

  unload(scene: Phaser.Scene, assetKey: string): void {
    const deps = this.dependencies.get(assetKey) ?? [];

    for (const dep of deps) {
      if (dep.type === 'animation' && scene.anims.exists(dep.key)) {
        scene.anims.remove(dep.key);
      } else if (dep.type === 'tileset' && scene.textures.exists(dep.key)) {
        scene.textures.remove(dep.key);
      }
    }

    if (scene.textures.exists(assetKey)) {
      scene.textures.remove(assetKey);
    }

    this.dependencies.delete(assetKey);
  }

  unloadBatch(scene: Phaser.Scene, assetKeys: string[]): void {
    for (const key of assetKeys) {
      this.unload(scene, key);
    }
  }

  getDependencies(assetKey: string): Dependency[] {
    return this.dependencies.get(assetKey) ?? [];
  }

  isLoaded(assetKey: string): boolean {
    return this.dependencies.has(assetKey);
  }

  clear(): void {
    this.dependencies.clear();
  }
}
