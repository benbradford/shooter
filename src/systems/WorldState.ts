export type WorldState = {
  player: {
    health: number;
    coins: number;
    currentLevel: string;
    spawnCol?: number;
    spawnRow?: number;
    entryCell: { col: number; row: number };
  };
  levels: {
    [levelName: string]: {
      liveEntities: string[];
      destroyedEntities: string[];
      firedTriggers: string[];
      modifiedCells: Array<{
        col: number;
        row: number;
        properties?: string[];
        backgroundTexture?: string;
        layer?: number;
      }>;
      cellModifierCells: Array<{ col: number; row: number }>;
    };
  };
};

export type LevelState = {
  liveEntities: string[];
  destroyedEntities: string[];
  firedTriggers: string[];
  modifiedCells: Array<{
    col: number;
    row: number;
    properties?: string[];
    backgroundTexture?: string;
    layer?: number;
  }>;
  cellModifierCells: Array<{ col: number; row: number }>;
};
