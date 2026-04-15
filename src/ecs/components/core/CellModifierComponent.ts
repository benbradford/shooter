import type { Component } from '../../Component';
import type { Grid, CellProperty } from '../../../systems/grid/Grid';
import { Depth } from '../../../constants/DepthConstants';

export type CellModification = {
  col: number;
  row: number;
  properties?: CellProperty[];
  backgroundTexture?: string;
  layer?: number;
}

export type CellModifierComponentProps = {
  cellsToModify: CellModification[];
  grid: Grid;
  scene: Phaser.Scene;
}

const FADE_DURATION_MS = 500;

export class CellModifierComponent implements Component {
  entity!: import('../../Entity').Entity;
  public readonly cellsToModify: CellModification[];
  private readonly grid: Grid;
  private readonly scene: Phaser.Scene;
  private executed: boolean = false;

  constructor(props: CellModifierComponentProps) {
    this.cellsToModify = props.cellsToModify;
    this.grid = props.grid;
    this.scene = props.scene;
  }

  update(_delta: number): void {
    console.log("Executing");
    if (this.executed) return;
    this.executed = true;

    console.log("Executed");
    for (const mod of this.cellsToModify) {
      const cell = this.grid.getCell(mod.col, mod.row);
      if (!cell) {
        console.warn(`[CellModifier] Cell (${mod.col}, ${mod.row}) not found`);
        continue;
      }
      console.log("Has cell");

      const updates: { properties?: Set<CellProperty>; backgroundTexture?: string; layer?: number } = {};

      if ('properties' in mod) {
        console.log("Has properties");
        updates.properties = mod.properties ? new Set(mod.properties) : new Set();
      } else {
        console.log("No properties");
        updates.properties = new Set();
      }

      if ('backgroundTexture' in mod) {
        console.log("has bg");
        updates.backgroundTexture = mod.backgroundTexture;
      } else {
        console.log("No bg");
        updates.backgroundTexture = undefined;
      }

      if (mod.layer !== undefined) {
        console.log("no layer");
        updates.layer = mod.layer;
      }
      console.log("Setting cell");
      this.grid.setCell(mod.col, mod.row, updates);
    }

    const gameScene = this.scene as unknown as {
      sceneRenderer?: { 
        invalidateCells: (cells: Array<{ col: number; row: number }>) => void;
        updateGraphics: (grid: Grid, levelData?: unknown) => void;
      };
      getLevelData: () => { cells: Array<{ col: number; row: number; backgroundTexture?: string; properties?: string[]; layer?: number }> };
    };

    if (gameScene.sceneRenderer && gameScene.getLevelData) {
      const levelData = gameScene.getLevelData();
      const cellsWithNewTextures: Array<{ col: number; row: number; texture: string }> = [];

      for (const mod of this.cellsToModify) {
        const levelCell = levelData.cells.find(c => c.col === mod.col && c.row === mod.row);
        if (levelCell) {
          if ('backgroundTexture' in mod) {
            if (mod.backgroundTexture) {
              levelCell.backgroundTexture = mod.backgroundTexture;
              cellsWithNewTextures.push({ col: mod.col, row: mod.row, texture: mod.backgroundTexture });
            } else {
              delete levelCell.backgroundTexture;
            }
          } else {
            delete levelCell.backgroundTexture;
          }
        }
      }

      gameScene.sceneRenderer.invalidateCells(this.cellsToModify);

      // Re-render grid graphics (walls, platforms, edges)
      gameScene.sceneRenderer.updateGraphics(this.grid, levelData);

      for (const cell of cellsWithNewTextures) {
        const worldPos = this.grid.cellToWorld(cell.col, cell.row);
        const sprite = this.scene.add.image(
          worldPos.x + this.grid.cellSize / 2,
          worldPos.y + this.grid.cellSize / 2,
          cell.texture
        );
        sprite.setDisplaySize(this.grid.cellSize, this.grid.cellSize);
        sprite.setDepth(Depth.cellTextureModified);
        sprite.setAlpha(0);

        this.scene.tweens.add({
          targets: sprite,
          alpha: 1,
          duration: FADE_DURATION_MS
        });
      }
    }

    this.entity.destroy();
  }

  onDestroy(): void {
    // Cleanup if needed
  }
}
