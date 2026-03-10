import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { getPumaAnimKey } from './PumaAnimations';
import { Direction } from '../../../constants/Direction';

const FADE_DELAY_MS = 1000;
const FADE_DURATION_MS = 500;

export class PumaDeathState implements IState {
  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene
  ) {}

  onEnter(): void {
    const sprite = this.entity.require(SpriteComponent);

    const animKey = getPumaAnimKey('idle', Direction.Down);
    sprite.sprite.play(animKey);

    this.scene.time.delayedCall(FADE_DELAY_MS, () => {
      this.scene.tweens.add({
        targets: sprite.sprite,
        alpha: 0,
        duration: FADE_DURATION_MS,
        onComplete: () => {
          this.entity.destroy();
        }
      });
    });
  }

  onUpdate(_delta: number): void {
    // Intentionally empty - death is handled by tween
  }
}
