import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { dirFromDelta, Direction } from '../../../constants/Direction';
import type Phaser from 'phaser';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { getBulletDudeDifficultyConfig, type BulletDudeDifficulty } from './BulletDudeDifficulty';
import { createBulletDudeBulletEntity } from './BulletDudeBulletEntity';
import { createShellCasingEntity } from '../projectile/ShellCasingEntity';
import type { Grid } from '../../../systems/grid/Grid';
import { BULLET_DUDE_EMITTER_OFFSETS } from './BulletDudeConstants';

export class BulletDudeShootingState implements IState {
  private bulletsFired = 0;
  private shootTimer = 0;
  private currentDirection = Direction.Down;

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly entityManager: import('../../EntityManager').EntityManager
  ) {}

  onEnter(): void {
    this.bulletsFired = 0;
    this.shootTimer = 0;
  }

  onUpdate(delta: number): void {
    const difficulty = this.entity.require(DifficultyComponent<BulletDudeDifficulty>);
    const config = getBulletDudeDifficultyConfig(difficulty.difficulty);
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const stateMachine = this.entity.require(StateMachineComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    this.currentDirection = dirFromDelta(dx, dy);
    const dirName = Direction[this.currentDirection].toLowerCase();
    sprite.sprite.play(`bulletdude_idle_${dirName}`, true);

    this.shootTimer += delta;

    if (this.shootTimer >= config.shootDelay && this.bulletsFired < config.maxBullets) {
      this.shootTimer = 0;
      this.fireBullet();
      this.bulletsFired++;

      if (this.bulletsFired >= config.maxBullets) {
        stateMachine.stateMachine.enter('overheated');
      }
    }
  }

  private fireBullet(): void {
    const difficulty = this.entity.require(DifficultyComponent<BulletDudeDifficulty>);
    const config = getBulletDudeDifficultyConfig(difficulty.difficulty);
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const offsetX = (Math.random() - 0.5) * 2 * config.aimAccuracy;
    const offsetY = (Math.random() - 0.5) * 2 * config.aimAccuracy;
    const targetX = playerTransform.x + offsetX;
    const targetY = playerTransform.y + offsetY;

    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const length = Math.hypot(dx, dy);
    const dirX = dx / length;
    const dirY = dy / length;

    const baseOffset = BULLET_DUDE_EMITTER_OFFSETS[this.currentDirection];
    const bulletX = transform.x + baseOffset.x;
    const bulletY = transform.y + baseOffset.y;

    const bullet = createBulletDudeBulletEntity({
      scene: this.scene,
      x: bulletX,
      y: bulletY,
      dirX,
      dirY,
      speed: config.bulletSpeed,
      grid: (this.scene as Phaser.Scene & { grid: Grid }).grid,
      layer: gridPos.currentLayer
    });
    this.entityManager.add(bullet);

    const shellDirection = this.currentDirection === Direction.Left ||
                          this.currentDirection === Direction.UpLeft ||
                          this.currentDirection === Direction.DownLeft ? 'left' : 'right';
    const shell = createShellCasingEntity(this.scene, transform.x, transform.y, shellDirection, this.currentDirection);
    this.entityManager.add(shell);
  }
}
