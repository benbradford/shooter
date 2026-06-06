import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { Direction } from '../../../constants/Direction';
import { getBeetleAnimKey } from './BeetleAnimations';
import { testAABBvsPolygon } from '../../../math/SATCollision';

const CHARGE_SPEED_PX_PER_SEC = 250;
const MAX_CHARGE_CELLS = 5;
const BEETLE_DAMAGE = 5;
const PLAYER_HIT_DISTANCE_PX = 30;
const PLAYER_KNOCKBACK_FORCE_PX = 300;

const DIR_DELTAS: Record<number, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
  [Direction.Right]: [1, 0],
};

export class BeetleChargeState implements IState {
  private direction: Direction = Direction.Down;
  private distanceTraveled = 0;
  private readonly maxDistancePx: number;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid,
    _scene: Phaser.Scene,
    private readonly blockedAreaManager?: BlockedAreaManager
  ) {
    this.maxDistancePx = MAX_CHARGE_CELLS * grid.cellSize;
  }

  onEnter(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (playerTransform) {
      const dx = playerTransform.x - transform.x;
      const dy = playerTransform.y - transform.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? Direction.Right : Direction.Left;
      } else {
        this.direction = dy > 0 ? Direction.Down : Direction.Up;
      }
    }

    this.distanceTraveled = 0;
    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(getBeetleAnimKey('run', this.direction));
  }

  onUpdate(delta: number): void {
    const deltas = DIR_DELTAS[this.direction];
    if (!deltas) return;
    const [dx, dy] = deltas;
    const transform = this.entity.require(TransformComponent);
    const speed = CHARGE_SPEED_PX_PER_SEC * (delta / 1000);

    const newX = transform.x + dx * speed;
    const newY = transform.y + dy * speed;

    // Check for player hit
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (playerTransform) {
      const dist = Math.hypot(newX - playerTransform.x, newY - playerTransform.y);
      if (dist < PLAYER_HIT_DISTANCE_PX) {
        this.hitPlayer(transform, playerTransform);
        this.entity.require(StateMachineComponent).stateMachine.enter('wander');
        return;
      }
    }

    // Check if target cell is walkable
    const gridPos = this.entity.require(GridPositionComponent);
    const targetCell = this.grid.worldToCell(newX, newY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);
    if (!cell || cell.layer !== gridPos.currentLayer || this.grid.isWall(cell) || cell.properties.has('water') || cell.properties.has('void') || cell.properties.has('blocked')) {
      this.entity.require(StateMachineComponent).stateMachine.enter('wander');
      return;
    }

    if (this.isInBlockedArea(newX, newY, gridPos)) {
      this.entity.require(StateMachineComponent).stateMachine.enter('wander');
      return;
    }

    transform.x = newX;
    transform.y = newY;
    this.distanceTraveled += speed;

    if (this.distanceTraveled >= this.maxDistancePx) {
      this.entity.require(StateMachineComponent).stateMachine.enter('wander');
    }
  }

  private hitPlayer(beetleTransform: TransformComponent, playerTransform: TransformComponent): void {
    const playerHealth = this.playerEntity.get(HealthComponent);
    if (playerHealth) {
      playerHealth.takeDamage(BEETLE_DAMAGE);
    }

    const playerKnockback = this.playerEntity.get(KnockbackComponent);
    if (playerKnockback) {
      const dx = playerTransform.x - beetleTransform.x;
      const dy = playerTransform.y - beetleTransform.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        playerKnockback.applyKnockback(dx / dist, dy / dist, PLAYER_KNOCKBACK_FORCE_PX);
      }
    }
  }

  private isInBlockedArea(x: number, y: number, gridPos: GridPositionComponent): boolean {
    if (!this.blockedAreaManager) return false;
    const box = gridPos.collisionBox;
    const aabb = {
      x: x + box.offsetX - box.width / 2,
      y: y + box.offsetY - box.height / 2,
      width: box.width,
      height: box.height,
    };
    const polygons = this.blockedAreaManager.getForLayer(gridPos.currentLayer);
    for (const polygon of polygons) {
      if (testAABBvsPolygon(aabb, polygon)) return true;
    }
    return false;
  }
}
