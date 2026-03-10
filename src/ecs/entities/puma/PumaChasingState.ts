import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { dirFromDelta } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { Pathfinder } from '../../../systems/Pathfinder';
import { getPumaAnimKey } from './PumaAnimations';

const ACCELERATION_TIME_MS = 400;
const TURN_RATE_RAD_PER_SEC = (240 * Math.PI) / 180;
const FRICTION = 0.88;
const PATH_RECALC_INTERVAL_MS = 500;

export class PumaChasingState implements IState {
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimer = 0;
  private velocityX = 0;
  private velocityY = 0;
  private currentAngle = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid,
    private readonly config: { chaseSpeedPxPerSec: number; jumpDetectDistancePx: number }
  ) {
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {
    this.path = null;
    this.currentPathIndex = 0;
    this.pathRecalcTimer = 0;
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    this.currentAngle = Math.atan2(dy, dx);
  }

  onUpdate(delta: number): void {
    this.pathRecalcTimer += delta;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    const sprite = this.entity.require(SpriteComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distancePx = Math.hypot(dx, dy);

    if (distancePx <= this.config.jumpDetectDistancePx) {
      stateMachine.stateMachine.enter('jumping');
      return;
    }

    if (this.pathRecalcTimer >= PATH_RECALC_INTERVAL_MS || this.path === null) {
      this.pathRecalcTimer = 0;
      const pumaCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);

      this.path = this.pathfinder.findPath(
        pumaCell.col, pumaCell.row,
        playerCell.col, playerCell.row,
        gridPos.currentLayer,
        false,
        true
      );
      this.currentPathIndex = 0;
    }

    let targetDx = 0;
    let targetDy = 0;

    if (this.path && this.path.length > 1) {
      if (this.currentPathIndex === 0) this.currentPathIndex = 1;

      if (this.currentPathIndex < this.path.length) {
        const targetNode = this.path[this.currentPathIndex];
        const nodeX = targetNode.col * this.grid.cellSize + this.grid.cellSize / 2;
        const nodeY = targetNode.row * this.grid.cellSize + this.grid.cellSize / 2;

        const nodeDist = Math.hypot(nodeX - transform.x, nodeY - transform.y);

        if (nodeDist < 10) {
          this.currentPathIndex++;
        } else {
          targetDx = nodeX - transform.x;
          targetDy = nodeY - transform.y;
        }
      }
    } else {
      targetDx = dx;
      targetDy = dy;
    }

    if (targetDx !== 0 || targetDy !== 0) {
      const targetAngle = Math.atan2(targetDy, targetDx);
      let angleDiff = targetAngle - this.currentAngle;
      
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const maxTurn = TURN_RATE_RAD_PER_SEC * (delta / 1000);
      if (Math.abs(angleDiff) <= maxTurn) {
        this.currentAngle = targetAngle;
      } else {
        this.currentAngle += Math.sign(angleDiff) * maxTurn;
      }

      const targetVelX = Math.cos(this.currentAngle) * this.config.chaseSpeedPxPerSec;
      const targetVelY = Math.sin(this.currentAngle) * this.config.chaseSpeedPxPerSec;

      const accelFactor = Math.min(1, delta / ACCELERATION_TIME_MS);
      this.velocityX += (targetVelX - this.velocityX) * accelFactor;
      this.velocityY += (targetVelY - this.velocityY) * accelFactor;

      this.velocityX *= Math.pow(FRICTION, delta / 1000);
      this.velocityY *= Math.pow(FRICTION, delta / 1000);

      transform.x += this.velocityX * (delta / 1000);
      transform.y += this.velocityY * (delta / 1000);

      const moveDx = Math.cos(this.currentAngle);
      const moveDy = Math.sin(this.currentAngle);
      const direction = dirFromDelta(moveDx, moveDy);

      const animKey = getPumaAnimKey('run', direction);
      if (!sprite.sprite.anims.isPlaying || sprite.sprite.anims.currentAnim?.key !== animKey) {
        sprite.sprite.play(animKey);
      }
    }
  }
}
