import type { IState, IStateEnterProps } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type Phaser from 'phaser';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';

const DEATH_FADE_DURATION_MS = 1000;
const KNOCKBACK_FORCE = 500;

type DyingStateData = {
  hitDirX: number;
  hitDirY: number;
};

export class BulletDudeDyingState implements IState<void | DyingStateData> {
  private fadeStarted = false;
  private knockbackApplied = false;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene
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

    const knockback = this.entity.require(KnockbackComponent);
    knockback.applyKnockback(hitDirX, hitDirY, KNOCKBACK_FORCE);
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
