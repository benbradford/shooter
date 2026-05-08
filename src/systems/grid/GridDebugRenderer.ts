/**
 * Handles all grid debug visualization — extracted from Grid data model.
 */
import type { Grid } from './Grid';
import type { BlockedAreaManager } from '../BlockedAreaManager';
import type { LevelData } from '../level/LevelLoader';

export class GridDebugRenderer {
  constructor(
    private readonly grid: Grid,
    private readonly graphics: Phaser.GameObjects.Graphics,
  ) {}

  renderGridDebug(levelData?: LevelData, blockedAreaManager?: BlockedAreaManager): void {
    const cellSize = this.grid.cellSize;

    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const cell = this.grid.getCell(col, row);
        const layer = cell?.layer ?? 0;

        let layerAlpha: number;
        let layerColor: number;

        if (layer < 0) {
          layerAlpha = 0.25;
          layerColor = 0xffffff;
        } else if (layer === 0) {
          layerAlpha = 0.1;
          layerColor = 0x808080;
        } else {
          layerAlpha = 0.3 + (layer * 0.1);
          layerColor = 0x000000;
        }

        this.graphics.fillStyle(layerColor, layerAlpha);
        this.graphics.fillRect(x, y, cellSize, cellSize);
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
      }
    }

    // Trigger cells with yellow outline
    if (levelData?.triggers) {
      for (const trigger of levelData.triggers) {
        for (const cell of trigger.triggerCells) {
          const worldPos = this.grid.cellToWorld(cell.col, cell.row);
          this.graphics.lineStyle(3, 0xffff00, 1);
          this.graphics.strokeRect(worldPos.x, worldPos.y, cellSize, cellSize);
        }
      }
    }

    // Blocked cells with black outline
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell?.properties.has('blocked')) {
          const worldPos = this.grid.cellToWorld(col, row);
          this.graphics.lineStyle(3, 0x000000, 1);
          this.graphics.strokeRect(worldPos.x, worldPos.y, cellSize, cellSize);
        }
      }
    }

    // Blocked area polygons
    this.renderBlockedAreas(blockedAreaManager);
  }

  private renderBlockedAreas(blockedAreaManager?: BlockedAreaManager): void {
    if (!blockedAreaManager) return;
    const areas = blockedAreaManager.getAll();
    for (const area of areas) {
      let color = 0x00ff00;
      if (area.layer === 0) color = 0xff0000;
      else if (area.layer === 1) color = 0x0000ff;

      this.graphics.fillStyle(color, 0.15);
      this.graphics.beginPath();
      this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
      for (let i = 1; i < area.vertices.length; i++) {
        this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      this.graphics.lineStyle(2, color, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
      for (let i = 1; i < area.vertices.length; i++) {
        this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    }
  }
}
