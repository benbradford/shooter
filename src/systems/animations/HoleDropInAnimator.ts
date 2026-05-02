import type { Entity } from '../../ecs/Entity';
import type { EntityManager } from '../../ecs/EntityManager';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../../ecs/components/core/SpriteComponent';
import { InputComponent } from '../../ecs/components/input/InputComponent';
import { WalkComponent } from '../../ecs/components/movement/WalkComponent';
import { AnimationComponent } from '../../ecs/components/core/AnimationComponent';
import { GridCollisionComponent } from '../../ecs/components/movement/GridCollisionComponent';
import { Direction } from '../../constants/Direction';

const DROP_DURATION_MS = 600;
const DROP_HEIGHT_PX = 300;
const PET_OFFSET_X_PX = 30;
const PET_OFFSET_Y_PX = 20;

export class HoleDropInAnimator {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly entityManager: EntityManager
  ) {}

  play(player: Entity, _targetX: number, targetY: number): void {
    const transform = player.require(TransformComponent);
    const sprite = player.require(SpriteComponent);
    const input = player.get(InputComponent);
    const walk = player.get(WalkComponent);
    const anim = player.require(AnimationComponent);
    const gridCollision = player.get(GridCollisionComponent);

    input?.setEnabled(false);
    if (walk) {
      walk.setEnabled(false);
      walk.resetVelocity(true, true);
      walk.lastDir = Direction.Down;
    }
    if (gridCollision) gridCollision.enabled = false;

    const startY = targetY - DROP_HEIGHT_PX;
    transform.y = startY;
    sprite.sprite.y = startY;

    anim.animationSystem.playFrameRange(`powerup_${Direction.Down}`, 4, 5, 'repeat', 0.08);

    const petTargetX = transform.x + PET_OFFSET_X_PX;
    const petStartY = startY + PET_OFFSET_Y_PX;
    const petTargetY = targetY + PET_OFFSET_Y_PX;
    let petLocked = false;

    let elapsed = 0;
    const dropUpdate = (_time: number, delta: number) => {
      elapsed += delta;
      const progress = Math.min(1, elapsed / DROP_DURATION_MS);
      const eased = progress * progress;
      transform.y = startY + (targetY - startY) * eased;

      const petEntity = this.entityManager.getFirst('pet');
      if (petEntity) {
        const petSpriteComp = petEntity.get(SpriteComponent);
        const petTransform = petEntity.get(TransformComponent);
        if (petSpriteComp && petTransform) {
          if (!petLocked) {
            const petGC = petEntity.get(GridCollisionComponent);
            if (petGC) petGC.enabled = false;
          }
          petLocked = true;
          const petY = petStartY + (petTargetY - petStartY) * eased;
          petTransform.x = petTargetX;
          petTransform.y = petY;
          petSpriteComp.sprite.setPosition(petTargetX, petY);
        }
      }

      if (progress >= 1) {
        this.scene.events.off('update', dropUpdate);
        transform.y = targetY;

        anim.animationSystem.play(`fall_${Direction.Down}`);

        this.scene.time.delayedCall(700, () => {
          if (gridCollision) {
            gridCollision.syncPreviousPosition(transform.x, transform.y);
            gridCollision.enabled = true;
          }
          input?.setEnabled(true);
          if (walk) walk.setEnabled(true);
          anim.animationSystem.play(`idle_${Direction.Down}`);
        });

        if (petLocked) {
          const petHoldUpdate = () => {
            const pe = this.entityManager.getFirst('pet');
            if (pe) {
              const ps = pe.get(SpriteComponent);
              const pt = pe.get(TransformComponent);
              if (ps && pt) {
                pt.x = petTargetX;
                pt.y = petTargetY;
                ps.sprite.setPosition(petTargetX, petTargetY);
              }
            }
          };
          this.scene.events.on('update', petHoldUpdate);
          this.scene.time.delayedCall(700, () => {
            this.scene.events.off('update', petHoldUpdate);
            const pe = this.entityManager.getFirst('pet');
            if (pe) {
              const petGC = pe.get(GridCollisionComponent);
              if (petGC) {
                petGC.syncPreviousPosition(petTargetX, petTargetY);
                petGC.enabled = true;
              }
            }
          });
        }
      }
    };

    this.scene.events.on('update', dropUpdate);
  }
}
