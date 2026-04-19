import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { AttackComboComponent } from '../../components/combat/AttackComboComponent';
import { PetAbilityComponent } from '../../components/pet/PetAbilityComponent';
import { WaterEffectComponent } from '../../components/visual/WaterEffectComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { PushableComponent, PUSH_ALIGNMENT_DIVISOR } from '../../components/pushable/PushableComponent';
import { handlePunchInput, handlePetAbilityInput } from './PlayerStateHelpers';
import { InteractionComponent } from '../../components/interaction/InteractionComponent';
import { Direction } from '../../../constants/Direction';

function getCardinalPushDirection(dx: number, dy: number): Direction | null {
  if (dx !== 0 && dy !== 0) return null;
  if (dx > 0) return Direction.Right;
  if (dx < 0) return Direction.Left;
  if (dy > 0) return Direction.Down;
  if (dy < 0) return Direction.Up;
  return null;
}

export class PlayerWalkState implements IState {
  private lastAnimKey = '';

  constructor(private readonly entity: Entity) {}

  onEnter(): void {
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const water = this.entity.get(WaterEffectComponent);
    const health = this.entity.require(HealthComponent);

    let prefix = 'walk';
    if (water?.getIsInWater()) prefix = 'swim';
    else if (health.isOverhealed()) prefix = 'run';
    this.lastAnimKey = `${prefix}_${walk.lastDir}`;
    anim.animationSystem.play(this.lastAnimKey);
  }


  onUpdate(_delta: number): void {
    const interaction = this.entity.get(InteractionComponent);
    if (interaction?.isActive || this.entity.tags.has('interaction_active')) return;
    
    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);
    const sm = this.entity.require(StateMachineComponent);
    const input = this.entity.require(InputComponent);
    const attackCombo = this.entity.require(AttackComboComponent);
    const petAbility = this.entity.require(PetAbilityComponent);
    const water = this.entity.get(WaterEffectComponent);
    const health = this.entity.require(HealthComponent);

    if (handlePetAbilityInput(input, petAbility, attackCombo, water)) {
      return;
    }

    if (handlePunchInput(input, attackCombo, water)) {
      return;
    }

    const { dx, dy } = input.getInputDelta();

    if (dx === 0 && dy === 0 && !walk.isMoving()) {
      sm.stateMachine.enter('idle');
      return;
    }

    let prefix = 'walk';
    if (water?.getIsInWater()) prefix = 'swim';
    else if (health.isOverhealed()) prefix = 'run';
    const newKey = `${prefix}_${walk.lastDir}`;
    if (newKey !== this.lastAnimKey) {
      this.lastAnimKey = newKey;
      anim.animationSystem.play(newKey);
    }

    // Check if player was blocked by a pushable this frame
    const gridCollision = this.entity.require(GridCollisionComponent);
    const blockedEntity = gridCollision.blockedByPushable;
    if (blockedEntity) {
      const pushable = blockedEntity.get(PushableComponent);
      if (pushable?.pushEnabled) {
        const pushDir = getCardinalPushDirection(dx, dy);
        if (pushDir) {
          // Check player is within central 50% of pushable on the perpendicular axis
          const transform = this.entity.require(TransformComponent);
          const pushableTransform = blockedEntity.require(TransformComponent);
          const gridCollision = this.entity.require(GridCollisionComponent);
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
  }
}
