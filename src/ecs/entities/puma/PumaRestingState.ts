import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { getPumaAnimKey } from './PumaAnimations';

const FOV_ANGLE_RAD = (30 * Math.PI) / 180;

export class PumaRestingState implements IState {
  private readonly currentDirection: Direction;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    _grid: Grid,
    private readonly config: { lookDistancePx: number; detectDistancePx: number },
    startDirection: Direction
  ) {
    this.currentDirection = startDirection;
  }

  onEnter(): void {
    const sprite = this.entity.require(SpriteComponent);
    const animKey = getPumaAnimKey('seated', this.currentDirection);
    sprite.sprite.play(animKey);
  }

  onUpdate(_delta: number): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distancePx = Math.hypot(dx, dy);

    if (distancePx <= this.config.detectDistancePx) {
      stateMachine.stateMachine.enter('standup');
      return;
    }

    if (distancePx <= this.config.lookDistancePx) {
      const angleToPlayer = Math.atan2(dy, dx);
      const facingAngle = this.getDirectionAngle(this.currentDirection);
      let angleDiff = angleToPlayer - facingAngle;
      
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) <= FOV_ANGLE_RAD / 2) {
        stateMachine.stateMachine.enter('standup');
      }
    }
  }

  private getDirectionAngle(dir: Direction): number {
    const angles: Record<Direction, number> = {
      [Direction.None]: 0,
      [Direction.Right]: 0,
      [Direction.DownRight]: Math.PI / 4,
      [Direction.Down]: Math.PI / 2,
      [Direction.DownLeft]: (3 * Math.PI) / 4,
      [Direction.Left]: Math.PI,
      [Direction.UpLeft]: (-3 * Math.PI) / 4,
      [Direction.Up]: -Math.PI / 2,
      [Direction.UpRight]: -Math.PI / 4
    };
    return angles[dir];
  }
}
