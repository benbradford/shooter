import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { Direction } from '../../../constants/Direction';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { LineOfSightComponent } from '../../components/combat/LineOfSightComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { getBulletDudeDifficultyConfig, type BulletDudeDifficulty } from './BulletDudeDifficulty';
import type { Grid } from '../../../systems/grid/Grid';

const GUARD_DIRECTIONS = [
  Direction.Up,
  Direction.UpRight,
  Direction.Right,
  Direction.DownRight,
  Direction.Down,
  Direction.DownLeft,
  Direction.Left,
  Direction.UpLeft
];

const DIRECTION_ANGLES: Record<Direction, number> = {
  [Direction.None]: 0,
  [Direction.Down]: Math.PI / 2,
  [Direction.Up]: -Math.PI / 2,
  [Direction.Left]: Math.PI,
  [Direction.Right]: 0,
  [Direction.UpLeft]: -3 * Math.PI / 4,
  [Direction.UpRight]: -Math.PI / 4,
  [Direction.DownLeft]: 3 * Math.PI / 4,
  [Direction.DownRight]: Math.PI / 4
};

export class BulletDudeGuardState implements IState {
  private currentDirectionIndex = 0;
  private rotateTimer = 0;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    _grid: Grid
  ) {}

  onEnter(): void {
    this.currentDirectionIndex = 0;
    this.rotateTimer = 0;
    this.updateDirection();
  }

  onUpdate(delta: number): void {
    const difficulty = this.entity.require(DifficultyComponent<BulletDudeDifficulty>);
    const config = getBulletDudeDifficultyConfig(difficulty.difficulty);
    const los = this.entity.require(LineOfSightComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    this.rotateTimer += delta;

    if (this.rotateTimer >= config.guardRotateSpeed) {
      this.rotateTimer = 0;
      this.currentDirectionIndex = (this.currentDirectionIndex + 1) % GUARD_DIRECTIONS.length;
      this.updateDirection();
    }

    if (los.canSeeTarget(this.entity, this.playerEntity)) {
      stateMachine.stateMachine.enter('alert');
    }
  }

  private updateDirection(): void {
    const direction = GUARD_DIRECTIONS[this.currentDirectionIndex];
    const sprite = this.entity.require(SpriteComponent);
    const los = this.entity.require(LineOfSightComponent);
    const dirName = Direction[direction].toLowerCase();

    sprite.sprite.play(`bulletdude_idle_${dirName}`);
    los.facingAngle = DIRECTION_ANGLES[direction];
  }
}
