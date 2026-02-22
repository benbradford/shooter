import type { CellProperty } from '../grid/Grid';

export type LevelTheme = 'dungeon' | 'swamp' | 'grass';

export type EntityType = 
  | 'stalking_robot' 
  | 'bug_base' 
  | 'thrower' 
  | 'skeleton' 
  | 'bullet_dude' 
  | 'eventchainer'
  | 'trigger'
  | 'exit'
  | 'breakable'
  | 'cellmodifier';

export type LevelEntity = {
  id: string;
  type: EntityType;
  createOnAnyEvent?: string[];
  createOnAllEvents?: string[];
  data: Record<string, unknown>;
}

export type LevelBackground = {
  floor_texture: string;
  platform_texture: string;
  stairs_texture: string;
  wall_texture: string;
  path_texture?: string;
  floor_tile: number;
  platform_tile?: number;
  overlays?: {
    spritesheet: string;
    spriteList: string;
    frequency: number;
    seed: number;
  };
  edgeDarkening?: {
    depth: number;
    intensity: number;
  };
  hasShadows?: boolean;
  hasEdges?: boolean;
}

export type LevelCell = {
  col: number;
  row: number;
  layer?: number;
  properties?: CellProperty[];
  backgroundTexture?: string;
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
  background?: LevelBackground;
  
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
      const response = await fetch(`levels/${levelName}.json`);
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
