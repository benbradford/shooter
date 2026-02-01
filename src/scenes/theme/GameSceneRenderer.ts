import type { Grid } from '../../systems/grid/Grid';

export type GameSceneRenderer = {
  renderGrid(grid: Grid): void;
  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image };
}
