import Phaser from 'phaser';
import { ASSET_REGISTRY, ASSET_GROUPS, type AssetKey, type AssetGroupKey } from './AssetRegistry';
import type { LevelData } from '../systems/level/LevelLoader';

/**
 * Preloads assets from the registry
 * @param scene - Phaser scene to load assets into
 * @param keys - Optional array of asset keys to load. If not provided, loads all assets
 */
export function preloadAssets(scene: Phaser.Scene, keys?: AssetKey[]): void {
  const keysToLoad: AssetKey[] = keys ?? ['player', 'attacker', 'floating_robot', 'exclamation', 'bullet_default', 'bullet_default_shell', 'smoke', 'robot_hit_particle', 'crosshair', 'slide_icon', 'fireball', 'fire', 'shadow', 'vignette', 'bug', 'bug_base', 'arrows', 'thrower', 'grenade', 'door_closed', 'dungeon_door', 'dungeon_key', 'rock', 'skeleton', 'bone_small', 'stone_stairs', 'stone_wall', 'stone_floor', 'dungeon_floor', 'dungeon_overlays'];
  keysToLoad.forEach((key: AssetKey) => {
    loadAsset(scene, key);
  });
}

/**
 * Loads a single asset by key
 */
function loadAsset(scene: Phaser.Scene, key: AssetKey): void {
  // Skip if already loaded
  if (scene.textures.exists(key)) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = ASSET_REGISTRY[key] as any;
  if (asset.type === 'spritesheet') {
    scene.load.spritesheet(asset.key, asset.path, asset.config);
  } else if (asset.type === 'image') {
    scene.load.image(asset.key, asset.path);
  } else if (asset.type === 'audio') {
    scene.load.audio(asset.key, asset.path);
  }
}

/**
 * Determines which asset groups are needed for a level
 */
export function getRequiredAssetGroups(levelData: LevelData): AssetGroupKey[] {
  const groups: AssetGroupKey[] = ['core', 'player'];

  // Enemies
  if (levelData.robots && levelData.robots.length > 0) {
    groups.push('stalking_robot');
  }
  if (levelData.bugBases && levelData.bugBases.length > 0) {
    groups.push('bug_base');
  }
  if (levelData.throwers && levelData.throwers.length > 0) {
    groups.push('thrower');
  }
  if (levelData.skeletons && levelData.skeletons.length > 0) {
    groups.push('skeleton');
  }
  if (levelData.bulletDudes && levelData.bulletDudes.length > 0) {
    // bulletDude uses attacker sprite
    groups.push('stalking_robot');
  }

  return groups;
}

/**
 * Extracts texture keys from level background config
 */
function getBackgroundTextures(levelData: LevelData): AssetKey[] {
  const textures: AssetKey[] = [];
  
  if (levelData.background) {
    const bg = levelData.background;
    if (bg.floor_texture) textures.push(bg.floor_texture as AssetKey);
    if (bg.platform_texture) textures.push(bg.platform_texture as AssetKey);
    if (bg.stairs_texture) textures.push(bg.stairs_texture as AssetKey);
    if (bg.wall_texture) textures.push(bg.wall_texture as AssetKey);
    if (bg.overlays?.spritesheet) {
      // Extract key from path like "assets/cell_drawables/dungeon_overlays_spritesheet.png"
      const key = bg.overlays.spritesheet.split('/').pop()?.replace('.png', '');
      if (key && key in ASSET_REGISTRY) {
        textures.push(key as AssetKey);
      }
    }
  }

  // Also check cells for custom backgroundTexture
  if (levelData.cells) {
    for (const cell of levelData.cells) {
      if (cell.backgroundTexture && cell.backgroundTexture in ASSET_REGISTRY) {
        textures.push(cell.backgroundTexture as AssetKey);
      }
    }
  }

  return textures;
}

/**
 * Loads only the assets needed for specific groups
 */
export function preloadAssetGroups(scene: Phaser.Scene, groups: AssetGroupKey[]): void {
  const assetKeys = new Set<AssetKey>();

  for (const group of groups) {
    const groupAssets = ASSET_GROUPS[group];
    if (groupAssets) {
      for (const key of groupAssets) {
        assetKeys.add(key);
      }
    }
  }

  for (const key of assetKeys) {
    loadAsset(scene, key);
  }
}

/**
 * Loads assets for a specific level (groups + background textures)
 */
export function preloadLevelAssets(scene: Phaser.Scene, levelData: LevelData): void {
  const groups = getRequiredAssetGroups(levelData);
  preloadAssetGroups(scene, groups);

  // Load background textures from level config
  const bgTextures = getBackgroundTextures(levelData);
  for (const key of bgTextures) {
    loadAsset(scene, key);
  }

  // Log all loaded textures after load completes
  scene.load.once('complete', () => {
    const loadedTextures = scene.textures.getTextureKeys().filter(key => key !== '__DEFAULT' && key !== '__MISSING');
    console.log(`[AssetLoader] Loaded ${loadedTextures.length} textures:`, loadedTextures.sort());
  });
}
