import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { Direction } from '../../../constants/Direction';
import { getBeetleAnimKey } from './BeetleAnimations';

const CHARGE_SPEED_PX_PER_SEC = 250;
const MAX_CHARGE_CELLS = 5;
const BEETLE_DAMAGE = 5;
const PLAYER_HIT_DISTANCE_PX = 30;
const PLAYER_KNOCKBACK_FORCE_PX = 300;

const DIR_DELTAS: Record<Direction, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
  [Direction.Right]: [1, 0],
  [Direction.None]: [0, 0],
  [Direction.UpLeft]: [-1, -1],
  [Direction.UpRight]: [1, -1],
  [Direction.DownLeft]: [-1, 1],
  [Direction.DownRight]: [1, 1],
};

export class BeetleChargeState implements IState {
  private direction: Direction = Direction.Down;
  private distanceTraveled = 0;
  private readonly maxDistancePx: number;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid,
    _scene: Phaser.Scene
  ) {
    this.maxDistancePx = MAX_CHARGE_CELLS * grid.cellSize;
  }

  onEnter(): void {
    // Determine charge direction toward player
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    if (playerTransform) {
      const dx = playerTransform.x - transform.x;
      const dy = playerTransform.y - transform.y;
      // Pick cardinal direction with largest component
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

  onExit(): void {
    // no-op
  }

  update(delta: number): string | void {
    const [dx, dy] = DIR_DELTAS[this.direction];
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
        return 'wander';
      }
    }

    // Check if target cell is walkable
    const gridPos = this.entity.require(GridPositionComponent);
    const targetCell = this.grid.worldToCell(newX, newY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);
    if (!cell || cell.layer !== gridPos.currentLayer || this.grid.isWall(cell) || cell.properties.has('water') || cell.properties.has('void')) {
      // Hit obstacle
      return 'wander';
    }

    transform.x = newX;
    transform.y = newY;
    this.distanceTraveled += speed;

    if (this.distanceTraveled >= this.maxDistancePx) {
      return 'wander';
    }
  }

  private hitPlayer(beetleTransform: TransformComponent, playerTransform: TransformComponent): void {
    // Damage player
    const playerHealth = this.playerEntity.get(HealthComponent);
    if (playerHealth) {
      playerHealth.takeDamage(BEETLE_DAMAGE);
    }

    // Knock player back
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
}
