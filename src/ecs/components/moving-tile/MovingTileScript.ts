export const MOVING_TILE_DEFAULT_TEXTURE = 'ice_platform';

export type MovingTileWaitStep = {
  waitMs: number;
};

export type MovingTileMoveStep = {
  moveTo: { col: number; row: number };
  speedCellsPerSec: number;
};

export type MovingTileStep = MovingTileWaitStep | MovingTileMoveStep;

export const isMoveStep = (step: MovingTileStep): step is MovingTileMoveStep =>
  (step as MovingTileMoveStep).moveTo !== undefined;

const DEFAULT_SPEED_CELLS_PER_SEC = 3;

/**
 * Parses a moving tile script from level data or the editor textarea.
 * Malformed steps are dropped so a bad edit degrades to a shorter script
 * rather than throwing during level load.
 */
export function parseMovingTileScript(raw: unknown): MovingTileStep[] {
  if (!Array.isArray(raw)) return [];

  const steps: MovingTileStep[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as Partial<MovingTileWaitStep> & Partial<MovingTileMoveStep>;

    if (typeof candidate.waitMs === 'number' && Number.isFinite(candidate.waitMs)) {
      steps.push({ waitMs: Math.max(0, candidate.waitMs) });
    } else if (
      typeof candidate.moveTo === 'object' && candidate.moveTo !== null &&
      typeof candidate.moveTo.col === 'number' && typeof candidate.moveTo.row === 'number'
    ) {
      const speed = typeof candidate.speedCellsPerSec === 'number' && candidate.speedCellsPerSec > 0
        ? candidate.speedCellsPerSec
        : DEFAULT_SPEED_CELLS_PER_SEC;
      steps.push({
        moveTo: { col: Math.round(candidate.moveTo.col), row: Math.round(candidate.moveTo.row) },
        speedCellsPerSec: speed,
      });
    }
  }
  return steps;
}
