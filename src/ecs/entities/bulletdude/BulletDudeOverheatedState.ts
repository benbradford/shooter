import type { IState } from '../../../systems/state/IState';
import { DEPTH_PARTICLE } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { dirFromDelta, Direction } from '../../../constants/Direction';
import type Phaser from 'phaser';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { getBulletDudeDifficultyConfig, type BulletDudeDifficulty, type BulletDudeDifficultyConfig } from './BulletDudeDifficulty';
import type { Grid } from '../../../systems/grid/Grid';
import { getPlayerFeetCell } from '../../../utils/PlayerPositionHelper';
import { BULLET_DUDE_EMITTER_OFFSETS } from './BulletDudeConstants';

const OVERHEAT_CHASE_SPEED_PX_PER_SEC = 75;
const PATH_RECALC_INTERVAL_MS = 500;
const FLAMES_PHASE_RATIO = 0.3;
const CHASE_STOP_MULTIPLIER = 1.5;

export class BulletDudeOverheatedState implements IState {
  private readonly pathfinder: Pathfinder;
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private overheatTimerMs = 0;
  private currentDirection = Direction.Down;
  private smokeParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {
    this.pathfinder = new Pathfinder(grid);
  }

  onEnter(): void {
    this.path = null;
    this.currentPathIndex = 0;
    this.pathRecalcTimerMs = 0;
    this.overheatTimerMs = 0;

    this.smokeParticles = this.scene.add.particles(0, 0, 'smoke', {
      speed: { min: 50, max: 100 },
      angle: { min: 250, max: 290 },
      scale: { start: 6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      frequency: 50,
      quantity: 2,
      emitting: false,
      tint: 0xffffff,
    });
    this.smokeParticles.setDepth(DEPTH_PARTICLE);

    this.fireParticles = this.scene.add.particles(0, 0, 'fire', {
      speed: { min: 80, max: 150 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      frequency: 20,
      quantity: 3,
      emitting: false,
      tint: [0xffffff, 0xff8800, 0xff0000],
      blendMode: 'ADD' as unknown as number,
    });
    this.fireParticles.setDepth(DEPTH_PARTICLE);
  }

  onExit(): void {
    this.smokeParticles.destroy();
    this.fireParticles.destroy();
  }

  onUpdate(delta: number): void {
    const difficulty = this.entity.require(DifficultyComponent<BulletDudeDifficulty>);
    const config = getBulletDudeDifficultyConfig(difficulty.difficulty);
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    this.overheatTimerMs += delta;
    this.pathRecalcTimerMs += delta;

    this.updateParticles(transform, config);

    const distToPlayer = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    const overheatRatio = this.overheatTimerMs / config.overheatPeriod;

    if (distToPlayer <= config.lookDistance && overheatRatio >= 1) {
      stateMachine.stateMachine.enter('shooting');
      return;
    }

    if (distToPlayer > config.lookDistance * CHASE_STOP_MULTIPLIER) {
      stateMachine.stateMachine.enter('guard');
      return;
    }

    this.updateMovement(delta, transform, playerTransform);
  }

  private updateParticles(transform: TransformComponent, config: BulletDudeDifficultyConfig): void {
    const offset = BULLET_DUDE_EMITTER_OFFSETS[this.currentDirection];
    const emitX = transform.x + offset.x;
    const emitY = transform.y + offset.y;

    this.smokeParticles.setPosition(emitX, emitY);
    this.fireParticles.setPosition(emitX, emitY - 15);

    const facingUp = this.currentDirection === Direction.UpLeft || 
                     this.currentDirection === Direction.Up || 
                     this.currentDirection === Direction.UpRight;
    const depth = facingUp ? -1 : 1000;
    this.smokeParticles.setDepth(depth);
    this.fireParticles.setDepth(depth + 1);

    const overheatRatio = this.overheatTimerMs / config.overheatPeriod;

    if (overheatRatio < FLAMES_PHASE_RATIO) {
      this.smokeParticles.emitting = false;
      this.fireParticles.emitting = true;
    } else if (overheatRatio < 1) {
      this.smokeParticles.emitting = true;
      this.fireParticles.emitting = false;
    } else {
      this.smokeParticles.emitting = false;
      this.fireParticles.emitting = false;
    }
  }

  private updateMovement(delta: number, transform: TransformComponent, _playerTransform: TransformComponent): void {
    const gridPos = this.entity.require(GridPositionComponent);
    const sprite = this.entity.require(SpriteComponent);

    if (this.pathRecalcTimerMs >= PATH_RECALC_INTERVAL_MS || this.path === null) {
      this.pathRecalcTimerMs = 0;

      const bulletDudeCell = this.grid.worldToCell(transform.x, transform.y);
      const playerCell = getPlayerFeetCell(this.playerEntity, this.grid);

      this.path = this.pathfinder.findPath(
        bulletDudeCell.col,
        bulletDudeCell.row,
        playerCell.col,
        playerCell.row,
        gridPos.currentLayer,
        false,
        true
      );
      this.currentPathIndex = 0;
    }

    if (this.path && this.path.length > 1) {
      if (this.currentPathIndex === 0) {
        this.currentPathIndex = 1;
      }

      if (this.currentPathIndex < this.path.length) {
        const targetNode = this.path[this.currentPathIndex];
        const targetWorld = this.grid.cellToWorld(targetNode.col, targetNode.row);
        const targetX = targetWorld.x + this.grid.cellSize / 2;
        const targetY = targetWorld.y + this.grid.cellSize / 2;

        const dirX = targetX - transform.x;
        const dirY = targetY - transform.y;
        const distance = Math.hypot(dirX, dirY);

        if (distance < 10) {
          this.currentPathIndex++;
        } else {
          const normalizedDirX = dirX / distance;
          const normalizedDirY = dirY / distance;

          transform.x += normalizedDirX * OVERHEAT_CHASE_SPEED_PX_PER_SEC * (delta / 1000);
          transform.y += normalizedDirY * OVERHEAT_CHASE_SPEED_PX_PER_SEC * (delta / 1000);

          this.currentDirection = dirFromDelta(normalizedDirX, normalizedDirY);
          const dirName = Direction[this.currentDirection].toLowerCase();
          sprite.sprite.play(`bulletdude_walk_${dirName}`, true);
        }
      }
    }
  }
}
