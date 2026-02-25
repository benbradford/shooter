import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';

const DEATH_ANIM_DURATION_MS = 1000;
const FADE_DURATION_MS = 1000;

export class PlayerDeathState implements IState {
  private elapsedMs = 0;
  private readonly scene: Phaser.Scene;
  private hasReloaded = false;

  constructor(private readonly entity: Entity, scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    
    walk.setEnabled(false);
    anim.animationSystem.play(`death_${walk.lastDir}`);
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs >= DEATH_ANIM_DURATION_MS) {
      const sprite = this.entity.require(SpriteComponent);
      const fadeProgress = Math.min(1, (this.elapsedMs - DEATH_ANIM_DURATION_MS) / FADE_DURATION_MS);
      sprite.sprite.setAlpha(1 - fadeProgress);
      
      if (fadeProgress >= 1 && !this.hasReloaded) {
        this.hasReloaded = true;
        this.scene.time.delayedCall(100, () => {
          this.reloadLevel();
        });
      }
    }
  }

  private reloadLevel(): void {
    const gameScene = this.scene.scene.get('game') as { reloadCurrentLevel?: () => void };
    if (gameScene?.reloadCurrentLevel) {
      gameScene.reloadCurrentLevel();
    }
  }
}
