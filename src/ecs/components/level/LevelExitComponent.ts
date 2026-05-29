import { BaseEventComponent } from '../core/BaseEventComponent';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { WorldFlags } from '../../../constants/WorldFlags';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import type { GridReader } from '../../../systems/grid/Grid';

export type LevelExitComponentProps = {
  eventName: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  preserveCol?: boolean;
  preserveRow?: boolean;
  grid?: GridReader;
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
}

export class LevelExitComponent extends BaseEventComponent {
  private readonly targetLevel: string;
  private readonly targetCol: number;
  private readonly targetRow: number;
  private readonly preserveCol: boolean;
  private readonly preserveRow: boolean;
  private readonly grid?: GridReader;
  private readonly onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;

  constructor(eventManager: EventManagerSystem, props: LevelExitComponentProps) {
    super(eventManager);
    this.targetLevel = props.targetLevel;
    this.targetCol = props.targetCol;
    this.targetRow = props.targetRow;
    this.preserveCol = props.preserveCol ?? false;
    this.preserveRow = props.preserveRow ?? false;
    this.grid = props.grid;
    this.onTransition = props.onTransition;
    this.registerEvent(props.eventName);
  }

  onEvent(_eventName: string): void {
    WorldStateManager.getInstance().setFlag(WorldFlags.enteredViaHole, '');

    let col = this.targetCol;
    let row = this.targetRow;

    if (this.preserveCol || this.preserveRow) {
      const player = this.grid?.getFirstEntityWithTag('player');
      const playerGridPos = player?.get(GridPositionComponent);
      if (playerGridPos) {
        if (this.preserveCol) col = playerGridPos.currentCell.col;
        if (this.preserveRow) row = playerGridPos.currentCell.row;
      }
    }

    this.onTransition(this.targetLevel, col, row);
  }
}
