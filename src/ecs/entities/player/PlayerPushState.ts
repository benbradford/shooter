import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { InputComponent } from '../../components/input/InputComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { PushableComponent } from '../../components/pushable/PushableComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { AttackButtonComponent } from '../../components/input/AttackButtonComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { Direction } from '../../../constants/Direction';
import { WorldStateManager } from '../../../systems/WorldStateManager';

const PUSH_SPEED_PX_PER_SEC = 100;

const CARDINAL_OFFSETS: Partial<Record<Direction, { dc: number; dr: number }>> = {
  [Direction.Up]: { dc: 0, dr: -1 },
  [Direction.Down]: { dc: 0, dr: 1 },
  [Direction.Left]: { dc: -1, dr: 0 },
  [Direction.Right]: { dc: 1, dr: 0 },
};

// Per-direction pixel offsets applied to player position while pushing
const PUSH_POSITION_OFFSETS: Partial<Record<Direction, { x: number; y: number }>> = {
  [Direction.Up]: { x: 0, y: 5 },
  [Direction.Down]: { x: 0, y: 20 },
  [Direction.Left]: { x: -6, y: 0 },
  [Direction.Right]: { x: 6, y: 0 },
};

// Per-direction shadow offset adjustments while pushing
const PUSH_SHADOW_OFFSETS: Partial<Record<Direction, { x: number; y: number }>> = {
  [Direction.Up]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: 0 },
  [Direction.Left]: { x: 17, y: 0 },
  [Direction.Right]: { x: -17, y: 0 },
};

export type PushStateData = {
  pushableEntity: Entity;
  direction: Direction;
  joystickEntity: Entity;
  blockedAreaManager?: BlockedAreaManager;
  levelName: string;
};

function isPushBlocked(
  targetCol: number, targetRow: number,
  pushableLayer: number,
  grid: Grid,
  blockedAreaManager?: BlockedAreaManager
): boolean {
  const cell = grid.getCell(targetCol, targetRow);
  if (!cell) return true;
  if (grid.isWall(cell) || cell.properties.has('platform')) return true;
  if (cell.properties.has('water') && !cell.properties.has('bridge')) return true;
  if (grid.isTransition(cell)) return true;
  if (grid.getLayer(cell) !== pushableLayer) return true;
  if (blockedAreaManager) {
    const cellKey = `${targetCol},${targetRow}`;
    if (blockedAreaManager.getBlockedCells().has(cellKey)) return true;
  }
  for (const occupant of cell.occupants) {
    if (occupant.get(GridCellBlocker)) return true;
  }
  return false;
}

export class PlayerPushState implements IState {
  private pushableEntity!: Entity;
  private direction!: Direction;
  private joystickEntity!: Entity;
  private blockedAreaManager?: BlockedAreaManager;
  private levelName = '';
  private phase: 'contact' | 'pushing' = 'contact';
  private playerMoveStartX = 0;
  private playerMoveStartY = 0;
  private playerMoveTargetX = 0;
  private playerMoveTargetY = 0;
  private playerProgress = 0;
  private playerMoveTotalDistPx = 0;
  private damagePending = false;
  private lastKnownHealth = 0;

  constructor(
    private readonly entity: Entity,
    private readonly grid: Grid
  ) {}

  onEnter(props?: { data?: unknown }): void {
    const data = props?.data as PushStateData | undefined;
    if (!data) return;

    this.pushableEntity = data.pushableEntity;
    this.direction = data.direction;
    this.joystickEntity = data.joystickEntity;
    this.blockedAreaManager = data.blockedAreaManager;
    this.levelName = data.levelName;
    this.phase = 'contact';
    this.damagePending = false;

    const health = this.entity.require(HealthComponent);
    this.lastKnownHealth = health.getHealth();

    // Disable walk, play lean anim
    const walk = this.entity.require(WalkComponent);
    walk.setEnabled(false);
    walk.resetVelocity(true, true);
    walk.lastDir = this.direction;

    // Apply push position offset
    const posOffset = PUSH_POSITION_OFFSETS[this.direction];
    if (posOffset) {
      const transform = this.entity.require(TransformComponent);
      transform.x += posOffset.x;
      transform.y += posOffset.y;
      const gridCollision = this.entity.get(GridCollisionComponent);
      gridCollision?.syncPreviousPosition(transform.x, transform.y);
    }

    // Apply shadow offset
    const shadow = this.entity.get(ShadowComponent);
    const shadowOffset = PUSH_SHADOW_OFFSETS[this.direction];
    if (shadow && shadowOffset) {
      shadow.pushOffset(shadowOffset.x, shadowOffset.y);
    }

    const anim = this.entity.require(AnimationComponent);
    anim.animationSystem.play(`push_${this.direction}`);
    anim.animationSystem.setTimeScale(0);

    // Set icon override
    const attackButton = this.joystickEntity.get(AttackButtonComponent);
    attackButton?.setIconOverride('push');
  }

  onUpdate(delta: number): void {
    // Check damage
    const health = this.entity.require(HealthComponent);
    if (health.getHealth() < this.lastKnownHealth) {
      this.lastKnownHealth = health.getHealth();
      if (this.phase === 'pushing') {
        this.damagePending = true;
      } else {
        this.disengage();
        return;
      }
    }

    if (this.phase === 'contact') {
      this.updateContact();
    } else {
      this.updatePushing(delta);
    }
  }

  private updateContact(): void {
    const input = this.entity.require(InputComponent);
    const { dx, dy } = input.getRawInputDelta();

    // Check joystick input → only disengage if moving AWAY from push direction
    if (dx !== 0 || dy !== 0) {
      const offset = CARDINAL_OFFSETS[this.direction];
      if (offset) {
        const dot = dx * offset.dc + dy * offset.dr;
        if (dot <= 0) {
          this.disengage();
          return;
        }
      }
      // Joystick pointing toward pushable — stay in contact
    } else {
      // Joystick released — disengage
      this.disengage();
      return;
    }

    // Check attack button → tryPush
    if (input.isAttackPressed()) {
      this.tryPush();
    }
  }

  private tryPush(): void {
    const pushable = this.pushableEntity.require(PushableComponent);
    const offset = CARDINAL_OFFSETS[this.direction];
    if (!offset) return;

    const targetCol = pushable.getCurrentCol() + offset.dc;
    const targetRow = pushable.getCurrentRow() + offset.dr;

    if (isPushBlocked(targetCol, targetRow, pushable.layer, this.grid, this.blockedAreaManager)) {
      // Play strain animation but don't move
      const anim = this.entity.require(AnimationComponent);
      anim.animationSystem.play(`push_${this.direction}`);
      return;
    }

    // Valid push
    this.phase = 'pushing';
    const anim = this.entity.require(AnimationComponent);
    anim.animationSystem.play(`push_${this.direction}`);
    anim.animationSystem.setTimeScale(1);

    pushable.startMove(targetCol, targetRow, this.grid);

    // Player follows: move exactly one cell in push direction from current position
    const transform = this.entity.require(TransformComponent);
    this.playerMoveStartX = transform.x;
    this.playerMoveStartY = transform.y;
    this.playerMoveTargetX = transform.x + offset.dc * this.grid.cellSize;
    this.playerMoveTargetY = transform.y + offset.dr * this.grid.cellSize;
    this.playerProgress = 0;
    this.playerMoveTotalDistPx = this.grid.cellSize;

    // Persist if needed
    if (pushable.doesPersist) {
      const worldState = WorldStateManager.getInstance();
      worldState.updateMovedEntity(this.levelName, this.pushableEntity.id, targetCol, targetRow);
    }
  }

  private updatePushing(delta: number): void {
    const pushable = this.pushableEntity.require(PushableComponent);
    const transform = this.entity.require(TransformComponent);

    // Interpolate player position
    if (this.playerMoveTotalDistPx > 0) {
      this.playerProgress += (PUSH_SPEED_PX_PER_SEC * delta / 1000) / this.playerMoveTotalDistPx;
      if (this.playerProgress > 1) this.playerProgress = 1;
      transform.x = this.playerMoveStartX + (this.playerMoveTargetX - this.playerMoveStartX) * this.playerProgress;
      transform.y = this.playerMoveStartY + (this.playerMoveTargetY - this.playerMoveStartY) * this.playerProgress;
    }

    // Check if move complete
    if (!pushable.getIsMoving()) {
      // Snap player to final position and sync collision
      transform.x = this.playerMoveTargetX;
      transform.y = this.playerMoveTargetY;
      const gridCollision = this.entity.get(GridCollisionComponent);
      gridCollision?.syncPreviousPosition(transform.x, transform.y);

      if (this.damagePending) {
        this.disengage();
        return;
      }

      // Check if attack still held → chain push
      const input = this.entity.require(InputComponent);
      if (input.isAttackPressed()) {
        this.tryPush();
        if (this.phase === 'contact') {
          // tryPush didn't start a new push (blocked), freeze anim
          const anim = this.entity.require(AnimationComponent);
          anim.animationSystem.play(`push_${this.direction}`);
          anim.animationSystem.setTimeScale(0);
        }
      } else {
        // Return to contact phase, freeze anim
        this.phase = 'contact';
        const anim = this.entity.require(AnimationComponent);
        anim.animationSystem.play(`push_${this.direction}`);
        anim.animationSystem.setTimeScale(0);
      }
    }
  }

  private disengage(): void {
    if (this.phase === 'pushing') {
      this.damagePending = true;
      return;
    }
    const sm = this.entity.require(StateMachineComponent);
    sm.stateMachine.enter('idle');
  }

  onExit(): void {
    // Defensive cleanup — runs on ANY state exit
    const walk = this.entity.get(WalkComponent);
    if (walk) walk.setEnabled(true);

    // Reset animation timeScale
    const anim = this.entity.get(AnimationComponent);
    anim?.animationSystem.setTimeScale(1);

    // Remove push position offset
    const posOffset = PUSH_POSITION_OFFSETS[this.direction];
    if (posOffset) {
      const transform = this.entity.require(TransformComponent);
      transform.x -= posOffset.x;
      transform.y -= posOffset.y;
    }

    const attackButton = this.joystickEntity?.get(AttackButtonComponent);
    attackButton?.setIconOverride(null);

    // Restore shadow offsets
    const shadow = this.entity.get(ShadowComponent);
    shadow?.popOffset();

    this.damagePending = false;
  }
}
