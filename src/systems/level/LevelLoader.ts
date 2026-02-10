import type { CellProperty } from '../grid/Grid';

export type LevelTheme = 'dungeon' | 'swamp';

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

export type LevelData = {
  width: number;
  height: number;
  playerStart: {
    x: number;
    y: number;
  };
  cells: LevelCell[];
  robots?: LevelRobot[];
  bugBases?: LevelBugBase[];
  throwers?: LevelThrower[];
  skeletons?: LevelSkeleton[];
  bulletDudes?: LevelBulletDude[];
  triggers?: LevelTrigger[];
  spawners?: LevelSpawner[];
  levelTheme?: LevelTheme;
}

export class LevelLoader {
  static async load(levelName: string): Promise<LevelData> {
    try {
      const response = await fetch(`levels/${levelName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json() as LevelData;
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
