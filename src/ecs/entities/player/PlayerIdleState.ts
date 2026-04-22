import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { PushableComponent, PUSH_ALIGNMENT_DIVISOR } from '../../components/pushable/PushableComponent';
import { Direction } from '../../../constants/Direction';
import { handlePunchInput, handlePetAbilityInput } from './PlayerStateHelpers';
import { InteractionComponent } from '../../components/interaction/InteractionComponent';
import { PetManager } from '../../../systems/PetManager';
import { RockThrowAbility } from '../../components/pet/RockThrowAbility';

const CARDINAL_DOMINANCE_RATIO = 3;

function getCardinalPushDirectionIdle(dx: number, dy: number): Direction | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx > absDy * CARDINAL_DOMINANCE_RATIO) {
    return dx > 0 ? Direction.Right : Direction.Left;
  }
  if (absDy > absDx * CARDINAL_DOMINANCE_RATIO) {
    return dy > 0 ? Direction.Down : Direction.Up;
  }
  return null;
}

export class PlayerIdleState implements IState {
  private lastDir: Direction = Direction.Down;

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const water = this.entity.get(WaterEffectComponent);
    
    this.lastDir = walk.lastDir;
    const prefix = water?.getIsInWater() ? 'swim' : 'idle';
    anim.animationSystem.play(`${prefix}_${this.lastDir}`);
  }


  onUpdate(_delta: number): void {
    const interaction = this.entity.get(InteractionComponent);
    if (interaction?.isActive || this.entity.tags.has('interaction_active')) return;
    
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const input = this.entity.require(InputComponent);
    const attackCombo = this.entity.require(AttackComboComponent);
    const petAbility = this.entity.require(PetAbilityComponent);
    const water = this.entity.get(WaterEffectComponent);
    
    if (handlePetAbilityInput(input, petAbility, attackCombo, water)) {
      return;
    }

    const petEntity = PetManager.getInstance().getActivePetEntity();
    const rockThrow = petEntity?.get(RockThrowAbility);
    if (rockThrow?.isPlayerLocked()) {
      return;
    }
    
    if (handlePunchInput(input, attackCombo, water)) {
      return;
    }
    
    if (walk.lastDir !== this.lastDir) {
      this.lastDir = walk.lastDir;
      const prefix = water?.getIsInWater() ? 'swim' : 'idle';
      anim.animationSystem.play(`${prefix}_${this.lastDir}`);
    }
    
    if (walk.isMoving()) {
      // Check if player was blocked by a pushable this frame
      const gridCollision = this.entity.require(GridCollisionComponent);
      const blockedEntity = gridCollision.blockedByPushable;
      if (blockedEntity) {
        const pushable = blockedEntity.get(PushableComponent);
        if (pushable?.pushEnabled) {
          const input2 = this.entity.require(InputComponent);
          const { dx: idx, dy: idy } = input2.getRawInputDelta();
          const pushDir = getCardinalPushDirectionIdle(idx, idy);
          if (pushDir) {
            // Check player is within central 50% of pushable on the perpendicular axis
            const transform = this.entity.require(TransformComponent);
            const pushableTransform = blockedEntity.require(TransformComponent);
            const halfCell = gridCollision.getGrid().cellSize / PUSH_ALIGNMENT_DIVISOR;
            const isHorizontalPush = pushDir === Direction.Left || pushDir === Direction.Right;
            const offset = isHorizontalPush
              ? Math.abs(transform.y - pushableTransform.y)
              : Math.abs(transform.x - pushableTransform.x);
            if (offset > halfCell) {
              // Not aligned — just block movement, don't engage push
            } else {
              const gameScene = this.entity.getScene() as import('../../../scenes/GameScene').default;
              const hudScene = gameScene.scene.get('HudScene') as import('../../../scenes/HudScene').default;
              const sm = this.entity.require(StateMachineComponent);
              sm.stateMachine.enter('push', {
                pushableEntity: blockedEntity,
                direction: pushDir,
                joystickEntity: hudScene.getJoystickEntity(),
                blockedAreaManager: (gameScene as unknown as { blockedAreaManager?: import('../../../systems/BlockedAreaManager').BlockedAreaManager }).blockedAreaManager,
                levelName: gameScene.getCurrentLevelName(),
              } as unknown as void);
              return;
            }
          }
        }
      }

      const sm = this.entity.require(StateMachineComponent);
      sm.stateMachine.enter('walk');
    }
  }
}
