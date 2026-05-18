import { BaseEventComponent } from '../core/BaseEventComponent';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { WorldFlags } from '../../../constants/WorldFlags';

export type LevelExitComponentProps = {
  eventName: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
}

export class LevelExitComponent extends BaseEventComponent {
  private readonly targetLevel: string;
  private readonly targetCol: number;
  private readonly targetRow: number;
  private readonly onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;

  constructor(eventManager: EventManagerSystem, props: LevelExitComponentProps) {
    super(eventManager);
    this.targetLevel = props.targetLevel;
    this.targetCol = props.targetCol;
    this.targetRow = props.targetRow;
    this.onTransition = props.onTransition;
    this.registerEvent(props.eventName);
  }

  onEvent(_eventName: string): void {
    WorldStateManager.getInstance().setFlag(WorldFlags.enteredViaHole, '');
    this.onTransition(this.targetLevel, this.targetCol, this.targetRow);
  }
}
