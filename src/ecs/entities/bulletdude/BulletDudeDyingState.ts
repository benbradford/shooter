import type { IState, IStateEnterProps } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type Phaser from 'phaser';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import type { Grid } from '../../../systems/grid/Grid';

const DEATH_FADE_DURATION_MS = 1000;
const KNOCKBACK_DISTANCE_PX = 100;
const KNOCKBACK_DURATION_MS = 200;

type DyingStateData = {
  hitDirX: number;
  hitDirY: number;
};

export class BulletDudeDyingState implements IState<void | DyingStateData> {
  private fadeStarted = false;
  private knockbackApplied = false;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {}

  onEnter(props?: IStateEnterProps<void | DyingStateData>): void {
    this.fadeStarted = false;
    this.knockbackApplied = false;

    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      collision.enabled = false;
    }

    if (props?.data && typeof props.data === 'object' && 'hitDirX' in props.data) {
      this.applyKnockback(props.data.hitDirX, props.data.hitDirY);
    }

    this.startFade();
  }

  onUpdate(_delta: number): void {
    // Fade tween handles everything
  }

  private applyKnockback(hitDirX: number, hitDirY: number): void {
    if (this.knockbackApplied) return;
    this.knockbackApplied = true;

    const transform = this.entity.require(TransformComponent);
    const targetX = transform.x + hitDirX * KNOCKBACK_DISTANCE_PX;
    const targetY = transform.y + hitDirY * KNOCKBACK_DISTANCE_PX;

    const targetCell = this.grid.worldToCell(targetX, targetY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);

    if (cell && !this.grid.isWall(cell)) {
      this.scene.tweens.add({
        targets: transform,
        x: targetX,
        y: targetY,
        duration: KNOCKBACK_DURATION_MS,
        ease: 'Quad.easeOut'
      });
    }
  }

  private startFade(): void {
    if (this.fadeStarted) return;
    this.fadeStarted = true;

    const sprite = this.entity.require(SpriteComponent);

    this.scene.tweens.add({
      targets: sprite.sprite,
      alpha: 0,
      duration: DEATH_FADE_DURATION_MS,
      ease: 'Linear',
      onComplete: () => {
        this.entity.destroy();
      }
    });
  }
}
