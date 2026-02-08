import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import type { Grid } from '../../../systems/grid/Grid';

const ACTIVATION_RANGE_PX = 400;
const MAX_BUGS = 6;

export class BugSpawnerComponent implements Component {
  entity!: Entity;
  private isActive = false;
  private spawnTimer = 0;
  private readonly onSpawn: (col: number, row: number) => void;
  private readonly playerEntity: Entity;
  private readonly spawnIntervalMs: number;
  private readonly grid: Grid;
  private activeBugs: Set<Entity> = new Set();

  constructor(playerEntity: Entity, onSpawn: (col: number, row: number) => void, spawnIntervalMs: number, grid: Grid) {
    this.playerEntity = playerEntity;
    this.onSpawn = onSpawn;
    this.spawnIntervalMs = spawnIntervalMs;
    this.grid = grid;
  }

  registerBug(bug: Entity): void {
    this.activeBugs.add(bug);
  }

  update(delta: number): void {
    this.activeBugs = new Set([...this.activeBugs].filter(bug => !bug.isDestroyed));

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (!this.isActive && distance < ACTIVATION_RANGE_PX) {
      this.isActive = true;
    }

    if (this.isActive && this.activeBugs.size < MAX_BUGS) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnIntervalMs) {
        this.spawnTimer = 0;
        const gridPos = this.entity.get(GridPositionComponent);
        if (gridPos) {
          const baseLayer = gridPos.currentLayer;
          const directions = [
            { col: gridPos.currentCell.col, row: gridPos.currentCell.row - 1 },
            { col: gridPos.currentCell.col, row: gridPos.currentCell.row + 1 },
            { col: gridPos.currentCell.col - 1, row: gridPos.currentCell.row },
            { col: gridPos.currentCell.col + 1, row: gridPos.currentCell.row }
          ];

          const validDirections = directions.filter(dir => {
            const cell = this.grid.getCell(dir.col, dir.row);
            return cell && this.grid.getLayer(cell) === baseLayer;
          });

          if (validDirections.length > 0) {
            const target = validDirections[Math.floor(Math.random() * validDirections.length)];
            this.onSpawn(target.col, target.row);
          }
        }
      }
    }
  }

  activate(): void {
    this.isActive = true;
  }

}
