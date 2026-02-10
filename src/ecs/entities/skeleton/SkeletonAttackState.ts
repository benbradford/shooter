import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { dirFromDelta, Direction } from '../../../constants/Direction';

const JAB_ANIMATION_DURATION_MS = 250;
const BONE_THROW_DELAY_MS = 150;

export class SkeletonAttackState implements IState {
  private elapsedMs = 0;
  private hasThrownBone = false;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly onThrowBone: (x: number, y: number, dirX: number, dirY: number) => void
  ) {}

  onEnter(): void {
    this.elapsedMs = 0;
    this.hasThrownBone = false;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const dirX = playerTransform.x - transform.x;
    const dirY = playerTransform.y - transform.y;
    const distance = Math.hypot(dirX, dirY);
    const normalizedDirX = dirX / distance;
    const normalizedDirY = dirY / distance;

    const direction = dirFromDelta(normalizedDirX, normalizedDirY);
    const dirName = Direction[direction].toLowerCase();

    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(`skeleton_jab_${dirName}`);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (!this.hasThrownBone && this.elapsedMs >= BONE_THROW_DELAY_MS) {
      this.hasThrownBone = true;

      const transform = this.entity.require(TransformComponent);
      const playerTransform = this.playerEntity.require(TransformComponent);

      const dirX = playerTransform.x - transform.x;
      const dirY = playerTransform.y - transform.y;
      const distance = Math.hypot(dirX, dirY);
      const normalizedDirX = dirX / distance;
      const normalizedDirY = dirY / distance;

      this.onThrowBone(transform.x, transform.y, normalizedDirX, normalizedDirY);
    }

    if (this.elapsedMs >= JAB_ANIMATION_DURATION_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('walk');
    }
  }
}
