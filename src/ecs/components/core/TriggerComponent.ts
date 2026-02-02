import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { GridPositionComponent } from '../movement/GridPositionComponent';

export type TriggerComponentProps = {
  eventName: string;
  triggerCells: Array<{ col: number; row: number }>;
  grid: Grid;
  eventManager: EventManagerSystem;
}

export class TriggerComponent implements Component {
  entity!: Entity;
  public readonly eventName: string;
  public readonly triggerCells: Array<{ col: number; row: number }>;
  private readonly grid: Grid;
  private readonly eventManager: EventManagerSystem;
  private triggered: boolean = false;

  constructor(props: TriggerComponentProps) {
    this.eventName = props.eventName;
    this.triggerCells = props.triggerCells;
    this.grid = props.grid;
    this.eventManager = props.eventManager;
  }

  update(_delta: number): void {
    if (this.triggered) return;

    // Check if player is in any trigger cell
    const playerEntities = this.grid.getEntitiesWithTag('player');
    if (playerEntities.length === 0) return;

    const player = playerEntities[0];
    const playerGridPos = player.get(GridPositionComponent);
    if (!playerGridPos) return;

    const playerCell = playerGridPos.currentCell;
    
    for (const triggerCell of this.triggerCells) {
      if (playerCell.col === triggerCell.col && playerCell.row === triggerCell.row) {
        this.triggered = true;
        this.eventManager.raiseEvent(this.eventName);
        this.entity.destroy();
        return;
      }
    }
  }

  onDestroy(): void {
    // Component cleanup handled by entity destruction
  }
}
