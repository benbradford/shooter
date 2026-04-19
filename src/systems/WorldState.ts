export type WorldState = {
  timePlayed: number; // seconds
  profileDisplayName?: string;
  player: {
    health: number;
    coins: number;
    currentLevel: string;
    spawnCol?: number;
    spawnRow?: number;
    entryCell: { col: number; row: number };
  };
  flags: {
    [key: string]: string;
  };
  levels: {
    [levelName: string]: LevelState;
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
  movedEntities?: Array<{
    id: string;
    col: number;
    row: number;
  }>;
};
