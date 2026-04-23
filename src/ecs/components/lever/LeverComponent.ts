import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { SpriteComponent } from '../core/SpriteComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export type LeverState = 'on' | 'off';

export type LeverComponentProps = {
  entityId: string;
  eventToRaise: string;
  eventManager: EventManagerSystem;
  startState: LeverState;
  oneShot: boolean;
};

export class LeverComponent implements Component {
  entity!: Entity;
  private readonly entityId: string;
  private readonly eventToRaise: string;
  private readonly eventManager: EventManagerSystem;
  private readonly oneShot: boolean;
  private state: LeverState;

  constructor(props: LeverComponentProps) {
    this.entityId = props.entityId;
    this.eventToRaise = props.eventToRaise;
    this.eventManager = props.eventManager;
    this.oneShot = props.oneShot;

    const flagKey = `${WorldStateManager.getInstance().getCurrentLevelName()}_lever_${props.entityId}`;
    const saved = WorldStateManager.getInstance().getFlag(flagKey);
    this.state = (saved === 'on' || saved === 'off') ? saved : props.startState;
  }

  private get flagPrefix(): string {
    return `${WorldStateManager.getInstance().getCurrentLevelName()}_lever_${this.entityId}`;
  }

  private get isLocked(): boolean {
    return this.oneShot && WorldStateManager.getInstance().getFlag(`${this.flagPrefix}_locked`) === 'true';
  }

  init(): void {
    const sprite = this.entity.require(SpriteComponent);
    if (this.isLocked) {
      sprite.sprite.setTexture('lever_dead');
    }
    if (this.state === 'on') {
      sprite.sprite.setFlipX(true);
    }
  }

  activate(): void {
    if (this.isLocked) return;

    this.state = this.state === 'on' ? 'off' : 'on';

    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setFlipX(this.state === 'on');

    const wsm = WorldStateManager.getInstance();
    wsm.setFlag(this.flagPrefix, this.state);
    if (this.oneShot) {
      wsm.setFlag(`${this.flagPrefix}_locked`, 'true');
      sprite.sprite.setTexture('lever_dead');
    }
    this.eventManager.raiseEvent(`${this.eventToRaise}|${this.state}`);
  }
}
