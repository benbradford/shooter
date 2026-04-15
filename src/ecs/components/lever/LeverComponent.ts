import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { SpriteComponent } from '../core/SpriteComponent';

export type LeverState = 'on' | 'off';

export type LeverComponentProps = {
  eventToRaise: string;
  eventManager: EventManagerSystem;
  startState: LeverState;
};

export class LeverComponent implements Component {
  entity!: Entity;
  private readonly eventToRaise: string;
  private readonly eventManager: EventManagerSystem;
  private state: LeverState;

  constructor(props: LeverComponentProps) {
    this.eventToRaise = props.eventToRaise;
    this.eventManager = props.eventManager;
    this.state = props.startState;
  }

  init(): void {
    if (this.state === 'on') {
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.setFlipX(true);
    }
  }

  activate(): void {
    this.state = this.state === 'on' ? 'off' : 'on';

    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setFlipX(this.state === 'on');

    this.eventManager.raiseEvent(`${this.eventToRaise}|${this.state}`);
    console.log(`${this.eventToRaise}|${this.state}`);
  }
}
