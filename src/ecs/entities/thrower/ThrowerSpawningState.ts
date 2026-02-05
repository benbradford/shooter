import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';

const SPAWN_DURATION_MS = 1000;

export class ThrowerSpawningState implements IState {
  private elapsedMs: number = 0;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    this.elapsedMs = 0;
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setAlpha(0);
    
    const shadow = this.entity.require(ShadowComponent);
    shadow.shadow.setAlpha(0);
    
    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = false;
    }
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;
    const progress = Math.min(this.elapsedMs / SPAWN_DURATION_MS, 1);
    
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setAlpha(progress);
    
    const shadow = this.entity.require(ShadowComponent);
    shadow.shadow.setAlpha(progress);

    if (this.elapsedMs >= SPAWN_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('idle');
    }
  }

  onExit(): void {
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.setAlpha(1);
    
    const shadow = this.entity.require(ShadowComponent);
    shadow.shadow.setAlpha(1);
    
    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = true;
    }
  }
}
