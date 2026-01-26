export interface LevelCell {
  col: number;
  row: number;
  layer?: number;
  isTransition?: boolean;
  backgroundTexture?: string;
}

export interface LevelRobot {
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
  waypoints: Array<{ col: number; row: number }>;
}

export interface LevelBugBase {
  col: number;
  row: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface VignetteConfig {
  alpha: number;
  tint: number;
  blendMode: number;
}

export interface BackgroundConfig {
  centerColor: string;
  midColor: string;
  edgeColor: string;
  outerColor: string;
  crackCount: number;
  circleCount: number;
  crackColor: string;
  crackVariation: number;
  crackThickness: number;
  crackLength: number;
  circleColor: string;
  circleVariation: number;
  circleThickness: number;
}

export interface LevelData {
  width: number;
  height: number;
  playerStart: {
    x: number;
    y: number;
  };
  cells: LevelCell[];
  robots?: LevelRobot[];
  bugBases?: LevelBugBase[];
  vignette?: VignetteConfig;
  background?: BackgroundConfig;
}

export class LevelLoader {
  static async load(levelName: string): Promise<LevelData> {
    try {
      const response = await fetch(`levels/${levelName}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data as LevelData;
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
