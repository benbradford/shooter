import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export type TriggerComponentProps = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number }>;
  grid: GridReader;
  eventManager: EventManagerSystem;
  oneShot: boolean;
}

export class TriggerComponent implements Component {
  entity!: Entity;
  public readonly eventName: string;
  public readonly triggerCells: Array<{ col: number; row: number }>;
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
