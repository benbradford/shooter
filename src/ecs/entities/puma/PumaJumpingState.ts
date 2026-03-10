import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { dirFromDelta } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { getPumaAnimKey } from './PumaAnimations';

export class PumaJumpingState implements IState {
  private startX = 0;
  private startY = 0;
  private targetX = 0;
  private targetY = 0;
  private elapsedMs = 0;
  private durationMs = 0;
  private velocityX = 0;
  private velocityY = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid,
    private readonly config: { jumpSpeedPxPerSec: number; jumpDamage: number }
  ) {}

  onEnter(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    this.startX = transform.x;
    this.startY = transform.y;

    const dx = playerTransform.x - this.startX;
    const dy = playerTransform.y - this.startY;
    const distancePx = Math.hypot(dx, dy);

    this.targetX = playerTransform.x + dx;
    this.targetY = playerTransform.y + dy;

    const jumpDistance = distancePx * 2;
    this.durationMs = (jumpDistance / this.config.jumpSpeedPxPerSec) * 1000;

    this.velocityX = (this.targetX - this.startX) / (this.durationMs / 1000);
    this.velocityY = (this.targetY - this.startY) / (this.durationMs / 1000);

    const direction = dirFromDelta(dx, dy);
    const animKey = getPumaAnimKey('jump', direction);
    sprite.sprite.play(animKey);

    this.elapsedMs = 0;
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const stateMachine = this.entity.require(StateMachineComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const progress = Math.min(1, this.elapsedMs / this.durationMs);

    const newX = this.startX + (this.targetX - this.startX) * progress;
    const newY = this.startY + (this.targetY - this.startY) * progress;

    const proposedCell = this.grid.worldToCell(newX, newY);
    const cell = this.grid.getCell(proposedCell.col, proposedCell.row);

    if (cell?.layer === gridPos.currentLayer && !cell.properties.has('wall') && !cell.properties.has('blocked')) {
      transform.x = newX;
      transform.y = newY;
    }

    const bounceHeight = 30;
    const bounceOffset = Math.sin(progress * Math.PI) * bounceHeight;
    sprite.sprite.y = transform.y - bounceOffset;

    const playerTransform = this.playerEntity.require(TransformComponent);
    const distToPlayer = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

    if (distToPlayer < 40) {
      const playerHealth = this.playerEntity.get(HealthComponent);
      if (playerHealth) {
        playerHealth.takeDamage(this.config.jumpDamage);
      }
    }

    if (progress >= 1) {
      sprite.sprite.y = transform.y;
      (this.entity as unknown as { jumpVelocityX: number; jumpVelocityY: number }).jumpVelocityX = this.velocityX;
      (this.entity as unknown as { jumpVelocityX: number; jumpVelocityY: number }).jumpVelocityY = this.velocityY;
      stateMachine.stateMachine.enter('recover');
    }
  }
}
