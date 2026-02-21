import type { Component } from '../../Component';
import type { Grid, CellProperty } from '../../../systems/grid/Grid';

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
    if (this.executed) return;
    this.executed = true;

    for (const mod of this.cellsToModify) {
      const cell = this.grid.getCell(mod.col, mod.row);
      if (!cell) {
        console.warn(`[CellModifier] Cell (${mod.col}, ${mod.row}) not found`);
        continue;
      }

      const updates: { properties?: Set<CellProperty>; backgroundTexture?: string; layer?: number } = {};

      if ('properties' in mod) {
        updates.properties = mod.properties ? new Set(mod.properties) : new Set();
      } else {
        updates.properties = new Set();
      }

      if ('backgroundTexture' in mod) {
        updates.backgroundTexture = mod.backgroundTexture;
      } else {
        updates.backgroundTexture = undefined;
      }

      if (mod.layer !== undefined) {
        updates.layer = mod.layer;
      }

      this.grid.setCell(mod.col, mod.row, updates);
    }
    
    const gameScene = this.scene as unknown as { 
      sceneRenderer?: { invalidateCells: (cells: Array<{ col: number; row: number }>) => void };
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
      
      for (const cell of cellsWithNewTextures) {
        const worldPos = this.grid.cellToWorld(cell.col, cell.row);
        const sprite = this.scene.add.image(
          worldPos.x + this.grid.cellSize / 2,
          worldPos.y + this.grid.cellSize / 2,
          cell.texture
        );
        sprite.setDisplaySize(this.grid.cellSize, this.grid.cellSize);
        sprite.setDepth(-4);
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
