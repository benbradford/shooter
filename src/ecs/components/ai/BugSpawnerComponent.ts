import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { HealthComponent } from '../core/HealthComponent';
import type { Grid } from '../../../systems/grid/Grid';

const ACTIVATION_RANGE_PX = 200;
const MAX_BUGS = 6;
const MAX_SPAWN_DISTANCE_PX = 650;

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

    // Don't spawn if base is dead
    const health = this.entity.get(HealthComponent);
    if (health && health.getHealth() <= 0) {
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (!this.isActive && distance < ACTIVATION_RANGE_PX) {
      this.isActive = true;
      this.spawnTimer = this.spawnIntervalMs;
    }

    if (this.isActive && this.activeBugs.size < MAX_BUGS) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnIntervalMs) {
        this.spawnTimer = 0;

        // Check if player is within spawn range
        if (distance > MAX_SPAWN_DISTANCE_PX) {
          return;
        }

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
