import type { CellProperty } from '../grid/Grid';

export type LevelTheme = 'dungeon' | 'swamp' | 'grass' | 'wilds' | 'default';

export type EntityType = 
  | 'stalking_robot' 
  | 'bug_base' 
  | 'thrower' 
  | 'skeleton' 
  | 'red_skeleton'
  | 'bullet_dude' 
  | 'puma'
  | 'eventchainer'
  | 'trigger'
  | 'exit'
  | 'breakable'
  | 'cellmodifier'
  | 'interaction'
  | 'collectible'
  | 'npc'
  | 'lever'
  | 'pushable';

export type LevelEntity = {
  id: string;
  type: EntityType;
  createOnAnyEvent?: string[];
  createOnAllEvents?: string[];
  respawnable?: boolean;
  suppressOnAnyFlag?: Array<{
    name: string;
    condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
    value: string | number;
  }>;
  data: Record<string, unknown>;
}

export type LevelBackground = {
  floor_texture: string;
  platform_texture: string;
  stairs_texture: string;
  wall_texture: string;
  path_texture?: string;
  water_texture?: string | string[];
  water_texture_edges?: string;
  water?: {
    sourceImage: string;
    flowDirection: 'left' | 'right' | 'up' | 'down';
    numFrames: number;
    animSpeedMs: number;
    force: number;
    rippleSpritesheet?: string;
    splashParticle?: string;
  };
  floor_tile: number;
  platform_tile?: number;
  overlays?: {
    spritesheet: string;
    spriteList: string;
    frequency: number;
    seed: number;
    placementStrategy?: 'near_platforms' | 'near_paths_water' | 'random';
    rotation?: 'none' | 'slight' | 'medium' | 'heavy';
    blendMode?: 'normal' | 'multiply';
    alphaBlend?: 'low' | 'medium' | 'high';
  };
  edgeDarkening?: {
    depth: number;
    intensity: number;
  };
  hasShadows?: boolean;
  hasEdges?: boolean;
  floorAlpha?: number;
}

export type AnimatedTextureConfig = {
  spritesheet: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number;
  transformOverride?: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  };
}

export type SourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BackgroundTextureConfig = {
  image: string;
  sourceRect?: SourceRect;
  transformOverride?: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  };
  zOffsetOverride?: number;
}

export type SingleBackgroundTexture = string | BackgroundTextureConfig;

export type LevelCell = {
  col: number;
  row: number;
  layer?: number;
  properties?: CellProperty[];
  backgroundTexture?: SingleBackgroundTexture | SingleBackgroundTexture[];
  animatedTexture?: AnimatedTextureConfig;
}

/** Normalize backgroundTexture to always be an array (or undefined). */
export function normalizeBgTextures(bt: SingleBackgroundTexture | SingleBackgroundTexture[] | undefined): SingleBackgroundTexture[] | undefined {
  if (bt === undefined || bt === '') return undefined;
  if (Array.isArray(bt)) return bt.length > 0 ? bt : undefined;
  return [bt];
}

/** Extract the string key from a single texture entry. */
export function bgTextureKey(tex: SingleBackgroundTexture): string {
  return typeof tex === 'string' ? tex : tex.image;
}

export type LevelRobot = {
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
  waypoints: Array<{ col: number; row: number }>;
}

export type LevelBugBase = {
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type LevelThrower = {
  id?: string;
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type LevelSkeleton = {
  id?: string;
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type LevelBulletDude = {
  id?: string;
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type LevelTrigger = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number }>;
  oneShot: boolean;
}

export type LevelSpawner = {
  eventName: string;
  enemyIds: string[];
  spawnDelayMs: number;
}

export type LevelExit = {
  eventName: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  description?: string;
}

export type BlockedAreaDef = {
  id: string;
  vertices: Array<{ x: number; y: number }>;
  layer: number;
  blocksProjectiles: boolean;
}

export type LevelData = {
  name?: string;
  width: number;
  height: number;
  playerStart: {
    x: number;
    y: number;
  };
  cells: LevelCell[];
  entities?: LevelEntity[];
  levelTheme?: LevelTheme;
  mistConfig?: {
    baseAlpha?: number;
    alphaRange?: number;
    baseScale?: number;
    scaleRange?: number;
  };
  background?: LevelBackground;
  
  blockedAreas?: BlockedAreaDef[];

  // Legacy fields (deprecated)
  robots?: LevelRobot[];
  bugBases?: LevelBugBase[];
  throwers?: LevelThrower[];
  skeletons?: LevelSkeleton[];
  bulletDudes?: LevelBulletDude[];
  triggers?: LevelTrigger[];
  spawners?: LevelSpawner[];
  exits?: LevelExit[];
}

export class LevelLoader {
  static async load(levelName: string): Promise<LevelData> {
    try {
      const response = await fetch(`/levels/${levelName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as LevelData;
      data.name = levelName;
      return data;
    } catch (error) {
      console.error(`Failed to load level ${levelName}:`, error);
      throw error;
    }
  }

  static createRect(
    colStart: number,
    rowStart: number,
    colEnd: number,
    rowEnd: number,
    props: Partial<LevelCell>
  ): LevelCell[] {
    const cells: LevelCell[] = [];
    for (let col = colStart; col <= colEnd; col++) {
      for (let row = rowStart; row <= rowEnd; row++) {
        cells.push({ col, row, ...props });
      }
    }
    return cells;
  }
}
