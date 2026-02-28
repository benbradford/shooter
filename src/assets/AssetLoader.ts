import Phaser from 'phaser';
import { ASSET_REGISTRY, ASSET_GROUPS, type AssetKey, type AssetGroupKey } from './AssetRegistry';
import type { LevelData } from '../systems/level/LevelLoader';

/**
 * Preloads assets from the registry
 * @param scene - Phaser scene to load assets into
 * @param keys - Optional array of asset keys to load. If not provided, loads all assets
 */
export function preloadAssets(scene: Phaser.Scene, keys?: AssetKey[]): void {
  // Core assets - sprites, enemies, UI (no level-specific textures)
  const coreAssets: AssetKey[] = [
    'attacker', 'floating_robot', 'exclamation', 'fireball', 'fire', 'robot_hit_particle',
    'crosshair', 'slide_icon', 'arrows', 'shadow', 'coin', 'medi_pack', 'vignette',
    'bug', 'bug_base', 'base_destroyed', 'thrower', 'grenade', 'skeleton', 'bone_small',
    'bullet_dude_sprite', 'rock', 'bullet_default', 'bullet_default_shell', 'smoke',
    'stone_path_tileset', 'grass2_path_tileset', 'water_path_tileset', 'water_path_tileset_edges', 'water_path_offset_tileset', 'water2', 'water_ripple',
    'dungeon_vase', 'pillar'
  ];
  
  const keysToLoad: AssetKey[] = keys ?? coreAssets;
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
  const groups: AssetGroupKey[] = ['core', 'player', 'breakables'];

  // Check entities array for enemy types
  if (levelData.entities) {
    const entityTypes = new Set(levelData.entities.map(e => e.type));
    
    if (entityTypes.has('stalking_robot')) {
      groups.push('stalking_robot');
    }
    if (entityTypes.has('bullet_dude')) {
      groups.push('bullet_dude');
    }
    if (entityTypes.has('bug_base')) {
      groups.push('bug_base');
    }
    if (entityTypes.has('thrower')) {
      groups.push('thrower');
    }
    if (entityTypes.has('skeleton')) {
      groups.push('skeleton');
    }
  }

  return groups;
}

/**
 * Extracts texture keys from level background config
 */
export function getBackgroundTextures(levelData: LevelData): AssetKey[] {
  const textureSet = new Set<AssetKey>();

  if (levelData.background) {
    const bg = levelData.background;
    if (bg.floor_texture) textureSet.add(bg.floor_texture as AssetKey);
    if (bg.platform_texture) textureSet.add(bg.platform_texture as AssetKey);
    if (bg.stairs_texture) textureSet.add(bg.stairs_texture as AssetKey);
    if (bg.wall_texture) textureSet.add(bg.wall_texture as AssetKey);
    if (bg.path_texture) textureSet.add(bg.path_texture as AssetKey);
    if (bg.water_texture) {
      if (Array.isArray(bg.water_texture)) {
        for (const tex of bg.water_texture) {
          textureSet.add(tex as AssetKey);
        }
      } else {
        textureSet.add(bg.water_texture as AssetKey);
      }
    }
    if (bg.water_texture_edges) textureSet.add(bg.water_texture_edges as AssetKey);
    if (bg.overlays?.spritesheet) {
      // Extract key from path like "assets/cell_drawables/dungeon_overlays_spritesheet.png"
      const key = bg.overlays.spritesheet.split('/').pop()?.replace('.png', '');
      if (key && key in ASSET_REGISTRY) {
        textureSet.add(key as AssetKey);
      }
    }
  }

  // Also check cells for custom backgroundTexture
  if (levelData.cells) {
    for (const cell of levelData.cells) {
      if (cell.backgroundTexture && cell.backgroundTexture in ASSET_REGISTRY) {
        textureSet.add(cell.backgroundTexture as AssetKey);
      } else if (cell.backgroundTexture && cell.backgroundTexture !== '') {
        console.warn('[AssetLoader] Cell texture not in registry:', cell.backgroundTexture);
      }
    }
  }

  return Array.from(textureSet);
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
export function preloadLevelAssets(scene: Phaser.Scene, levelData: LevelData, onComplete?: () => void): void {
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
    const sorted = [...loadedTextures].sort((a, b) => a.localeCompare(b));
    console.log(`[AssetLoader] Loaded ${loadedTextures.length} textures:`, sorted);
    if (onComplete) {
      onComplete();
    }
  });
}
