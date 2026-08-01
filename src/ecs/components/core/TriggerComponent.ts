import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { TransformComponent } from '../core/TransformComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export type TriggerDirection = 'N' | 'S' | 'E' | 'W';

export type TriggerComponentProps = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number; direction?: TriggerDirection }>;
  grid: GridReader;
  eventManager: EventManagerSystem;
  oneShot: boolean;
}

const EDGE_THRESHOLD_PERCENT = 0.3;
const PLAYER_FEET_OFFSET_Y_PX = 30;

export class TriggerComponent implements Component {
  entity!: Entity;
  public readonly eventName: string;
  public readonly triggerCells: Array<{ col: number; row: number; direction?: TriggerDirection }>;
  private readonly grid: GridReader;
  private readonly eventManager: EventManagerSystem;
  private readonly oneShot: boolean;
  private triggered: boolean = false;

  constructor(props: TriggerComponentProps) {
    this.eventName = props.eventName;
    this.triggerCells = props.triggerCells;
    this.grid = props.grid;
    this.eventManager = props.eventManager;
    this.oneShot = props.oneShot;
  }

  update(_delta: number): void {
    if (this.oneShot && this.triggered) return;

    const player = this.grid.getFirstEntityWithTag('player');
    if (!player) return;

    const playerGridPos = player.get(GridPositionComponent);
    if (!playerGridPos) return;

    const playerCell = playerGridPos.currentCell;
    
    for (const triggerCell of this.triggerCells) {
      if (playerCell.col === triggerCell.col && playerCell.row === triggerCell.row) {
        if (this.isCellBlocked(triggerCell.col, triggerCell.row)) continue;

        if (triggerCell.direction && !this.isPlayerNearEdge(player, triggerCell)) {
          continue;
        }

        this.triggered = true;
        console.log(`[Trigger] Raising event: ${this.eventName}`);
        this.eventManager.raiseEvent(this.eventName);

        if (this.oneShot) {
          const worldState = WorldStateManager.getInstance();
          const currentLevel = worldState.getCurrentLevelName();
          worldState.addFiredTrigger(currentLevel, this.eventName);
          this.entity.destroy();
        }
        return;
      }
    }
    
    if (!this.oneShot) {
      this.triggered = false;
    }
  }

  private isPlayerNearEdge(player: Entity, triggerCell: { col: number; row: number; direction?: TriggerDirection }): boolean {
    const transform = player.get(TransformComponent);
    if (!transform) return false;

    const cellWorld = this.grid.cellToWorld(triggerCell.col, triggerCell.row);
    const cellSize = this.grid.cellSize;
    const threshold = cellSize * EDGE_THRESHOLD_PERCENT;

    const playerX = transform.x;
    const playerFeetY = transform.y + PLAYER_FEET_OFFSET_Y_PX;

    switch (triggerCell.direction) {
      case 'E': return playerX >= cellWorld.x + cellSize - threshold;
      case 'W': return playerX <= cellWorld.x + threshold;
      case 'S': return playerFeetY >= cellWorld.y + cellSize - threshold;
      case 'N': return playerFeetY <= cellWorld.y + threshold;
      default: return true;
    }
  }

  private isCellBlocked(col: number, row: number): boolean {
    for (const occupant of this.grid.getOccupants(col, row)) {
      if (occupant.get(GridCellBlocker)) return true;
    }
    return false;
  }

  onDestroy(): void {
    // Component cleanup handled by entity destruction
  }
}
