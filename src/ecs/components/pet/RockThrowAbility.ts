import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { HealthComponent } from '../core/HealthComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import { ThrowArrowIndicator } from './ThrowArrowIndicator';
import { Direction } from '../../../constants/Direction';
import type { ThrowState, RockThrowContext, RockThrowStateHandler } from './rock-throw/RockThrowTypes';
import { RockChargingState } from './rock-throw/RockChargingState';
import { RockAimingState } from './rock-throw/RockAimingState';
import { RockFlightState } from './rock-throw/RockFlightState';
import { RockReturningState } from './rock-throw/RockReturningState';

const ROCK_DROP_DISTANCE_PX = 20;
const ANIM_TIMESCALE_NORMAL = 1;
const DEFAULT_THROW_DIR_Y = 1;
const DEFAULT_HEALTH = 100;

export class RockThrowAbility implements Component {
  entity!: Entity;
  private state: ThrowState = 'idle';
  private readonly ctx: RockThrowContext;
  private readonly chargingState: RockChargingState;
  private readonly aimingState: RockAimingState;
  private readonly flightState: RockFlightState;
  private readonly returningState: RockReturningState;
  private currentHandler: RockThrowStateHandler | null = null;

  constructor(scene: Phaser.Scene, grid: GridReader, playerEntity: Entity) {
    this.ctx = {
      scene,
      grid,
      playerEntity,
      entity: null as unknown as Entity,
      arrowIndicator: new ThrowArrowIndicator(scene),
      throwDirX: 0,
      throwDirY: DEFAULT_THROW_DIR_Y,
      throwDir: Direction.Down,
      lastKnownHealth: DEFAULT_HEALTH,
      setState: (newState: ThrowState) => this.transitionTo(newState),
    };
    this.chargingState = new RockChargingState(this.ctx);
    this.aimingState = new RockAimingState(this.ctx);
    this.flightState = new RockFlightState(this.ctx);
    this.returningState = new RockReturningState(this.ctx);
  }

  isActive(): boolean {
    return this.state === 'charging' || this.state === 'aiming';
  }

  isInFlight(): boolean {
    return this.state === 'throwing' || this.state === 'landed';
  }

  isPlayerLocked(): boolean {
    if (this.state === 'charging' || this.state === 'aiming') return true;
    if (this.state === 'throwing' && this.flightState.throwLockActive) return true;
    return false;
  }

  isAiming(): boolean {
    return this.state === 'aiming';
  }

  activate(): void {
    if (this.state !== 'idle' && this.state !== 'returning') return;

    if (this.state === 'returning') {
      const rockSprite = this.entity.get(SpriteComponent);
      if (rockSprite) rockSprite.visualOffsetYPx = 0;
    }

    this.transitionTo('charging');
  }

  update(delta: number): void {
    if ((this.ctx as { entity: Entity }).entity !== this.entity) {
      (this.ctx as { entity: Entity }).entity = this.entity;
    }

    if (this.state === 'idle') return;

    // Damage polling — cancel if player took damage during charge/aim
    if (this.state === 'charging' || this.state === 'aiming') {
      const health = this.ctx.playerEntity.get(HealthComponent);
      const currentHealth = health?.getHealth() ?? 0;
      if (currentHealth < this.ctx.lastKnownHealth) {
        this.cancelThrow();
        return;
      }
      this.ctx.lastKnownHealth = currentHealth;
    }

    this.currentHandler?.update(delta);
  }

  onDestroy(): void {
    this.currentHandler?.exit?.();
    this.currentHandler = null;
    this.ctx.arrowIndicator.destroy();

    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_NORMAL);
    }
  }

  private transitionTo(newState: ThrowState): void {
    this.currentHandler?.exit?.();
    this.state = newState;

    switch (newState) {
      case 'charging':
        this.currentHandler = this.chargingState;
        break;
      case 'aiming':
        this.currentHandler = this.aimingState;
        break;
      case 'throwing':
        this.currentHandler = this.flightState;
        break;
      case 'returning':
        this.currentHandler = this.returningState;
        break;
      case 'idle':
        this.currentHandler = null;
        return;
      default:
        this.currentHandler = null;
        return;
    }

    this.currentHandler?.enter?.();
  }

  private cancelThrow(): void {
    this.currentHandler?.exit?.();
    this.currentHandler = null;

    const rockTransform = this.entity.require(TransformComponent);
    rockTransform.y += ROCK_DROP_DISTANCE_PX;

    const playerAnim = this.ctx.playerEntity.get(AnimationComponent);
    if (playerAnim) {
      playerAnim.animationSystem.setTimeScale(ANIM_TIMESCALE_NORMAL);
    }

    this.state = 'returning';
    this.currentHandler = this.returningState;
    // No enter() needed — returning state just lerps back each frame
  }
}
