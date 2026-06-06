import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';
import { getBeetleAnimKey } from './BeetleAnimations';
import { testAABBvsPolygon } from '../../../math/SATCollision';

const WANDER_SPEED_PX_PER_SEC = 40;
const DIRECTION_CHANGE_MIN_MS = 1000;
const DIRECTION_CHANGE_MAX_MS = 3000;
const PLAYER_DETECT_DISTANCE_PX = 250;
const CHARGE_COOLDOWN_MS = 3000;
const CHARGE_DELAY_MS = 500;

const CARDINAL_DIRS: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
const DIR_DELTAS: Record<number, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
  [Direction.Right]: [1, 0],
};

export class BeetleWanderState implements IState {
  private direction: Direction = Direction.Down;
  private nextChangeMs = 0;
  private elapsedMs = 0;
  private chargeCooldownMs = CHARGE_COOLDOWN_MS;
  private chargeDelayMs = 0;
  private isPreparingCharge = false;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: Grid,
    private readonly blockedAreaManager?: BlockedAreaManager
  ) {}

  onEnter(): void {
    this.pickRandomDirection();
    this.elapsedMs = 0;
    this.nextChangeMs = this.randomInterval();
    this.isPreparingCharge = false;
    this.chargeDelayMs = 0;

    const sprite = this.entity.require(SpriteComponent);
    sprite.sprite.play(getBeetleAnimKey('sneak', this.direction));
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;
    this.chargeCooldownMs += delta;

    // Check for player detection
    if (this.chargeCooldownMs >= CHARGE_COOLDOWN_MS) {
      const transform = this.entity.require(TransformComponent);
      const playerTransform = this.playerEntity.get(TransformComponent);
      if (playerTransform) {
        const dist = Math.hypot(transform.x - playerTransform.x, transform.y - playerTransform.y);
        if (dist < PLAYER_DETECT_DISTANCE_PX) {
          if (!this.isPreparingCharge) {
            this.isPreparingCharge = true;
            this.chargeDelayMs = 0;
            const sprite = this.entity.require(SpriteComponent);
            sprite.sprite.play(getBeetleAnimKey('idle', this.direction));
          }
          this.chargeDelayMs += delta;
          if (this.chargeDelayMs >= CHARGE_DELAY_MS) {
            this.chargeCooldownMs = 0;
            this.entity.require(StateMachineComponent).stateMachine.enter('charge');
          }
          return;
        } else {
          this.isPreparingCharge = false;
        }
      }
    }

    // Change direction periodically
    if (this.elapsedMs >= this.nextChangeMs) {
      this.pickRandomDirection();
      this.elapsedMs = 0;
      this.nextChangeMs = this.randomInterval();
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.play(getBeetleAnimKey('sneak', this.direction));
    }

    // Move
    const deltas = DIR_DELTAS[this.direction];
    if (!deltas) return;
    const [dx, dy] = deltas;
    const transform = this.entity.require(TransformComponent);
    const speed = WANDER_SPEED_PX_PER_SEC * (delta / 1000);
    const newX = transform.x + dx * speed;
    const newY = transform.y + dy * speed;

    // Check if target cell is walkable
    const gridPos = this.entity.require(GridPositionComponent);
    const targetCell = this.grid.worldToCell(newX, newY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);
    if (cell && cell.layer === gridPos.currentLayer && !this.grid.isWall(cell) && !cell.properties.has('water') && !cell.properties.has('void') && !cell.properties.has('blocked') && !this.isInBlockedArea(newX, newY, gridPos)) {
      transform.x = newX;
      transform.y = newY;
    } else {
      this.pickRandomDirection();
      this.elapsedMs = 0;
      this.nextChangeMs = this.randomInterval();
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.play(getBeetleAnimKey('sneak', this.direction));
    }
  }

  private pickRandomDirection(): void {
    this.direction = CARDINAL_DIRS[Math.floor(Math.random() * CARDINAL_DIRS.length)];
  }

  private randomInterval(): number {
    return DIRECTION_CHANGE_MIN_MS + Math.random() * (DIRECTION_CHANGE_MAX_MS - DIRECTION_CHANGE_MIN_MS);
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
