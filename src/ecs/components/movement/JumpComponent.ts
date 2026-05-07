import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { AttackButtonComponent } from '../input/AttackButtonComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { JumpDetector, type PendingJump } from './JumpDetector';
import { JumpAnimator } from './JumpAnimator';
import type HudScene from '../../../scenes/HudScene';

export type JumpStartInfo = {
  readonly targetX: number;
  readonly targetY: number;
  readonly landCol: number;
  readonly landRow: number;
  readonly totalDurationMs: number;
  readonly flightDurationMs: number;
  readonly isFallJump: boolean;
};

export type JumpComponentProps = {
  readonly grid: GridReader;
  readonly scene?: Phaser.Scene;
  readonly onJumpStart?: (info: JumpStartInfo) => void;
};

export class JumpComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene | undefined;
  private readonly detector: JumpDetector;
  private readonly animator: JumpAnimator;
  private pendingJump: PendingJump | null = null;
  private isShowingJumpIcon = false;

  constructor(props: JumpComponentProps) {
    this.scene = props.scene;
    this.detector = new JumpDetector(props.grid, !!props.scene);
    this.animator = new JumpAnimator(props.grid);
    if (props.onJumpStart) {
      this.animator.setOnJumpStart(props.onJumpStart);
    }
  }

  isJumping(): boolean {
    return this.animator.phase !== 'idle';
  }

  triggerWaterJump(landCol: number, landRow: number, dx: number, dy: number, enteringWater: boolean): void {
    if (this.animator.phase !== 'idle') return;
    this.animator.startJump({ entity: this.entity, landCol, landRow, dx, dy, isFallJump: false, isPlatformJump: false, isWaterJump: true, isWaterEntry: enteringWater });
  }

  setOnJumpStart(callback: ((info: JumpStartInfo) => void) | undefined): void {
    this.animator.setOnJumpStart(callback);
  }

  private getAttackButton(): AttackButtonComponent | undefined {
    if (!this.scene) return undefined;
    const hudScene = this.scene.scene.get('HudScene') as HudScene | undefined;
    return hudScene?.getJoystickEntity()?.get(AttackButtonComponent);
  }

  update(delta: number): void {
    if (this.animator.phase !== 'idle') {
      this.animator.update(this.entity, delta);
      return;
    }

    this.animator.updateSafePosition(this.entity);

    const canJump = !this.scene || WorldStateManager.getInstance().getFlag('canJump') === 'true';
    const newPending = canJump ? this.detector.detect(this.entity) : null;

    const attackButton = this.getAttackButton();
    if (newPending) {
      this.pendingJump = newPending;

      if (!this.scene) {
        this.animator.startJump({ entity: this.entity, landCol: newPending.landCol, landRow: newPending.landRow, dx: newPending.dx, dy: newPending.dy, isFallJump: newPending.isFallJump, isPlatformJump: newPending.isPlatformJump, isWaterJump: false, isWaterEntry: false });
        this.pendingJump = null;
        return;
      }

      if (!this.isShowingJumpIcon) {
        attackButton?.setIconOverride('jump');
        this.isShowingJumpIcon = true;
      }
      if (attackButton?.isAttackPressed()) {
        this.animator.startJump({ entity: this.entity, landCol: this.pendingJump.landCol, landRow: this.pendingJump.landRow, dx: this.pendingJump.dx, dy: this.pendingJump.dy, isFallJump: this.pendingJump.isFallJump, isPlatformJump: this.pendingJump.isPlatformJump, isWaterJump: false, isWaterEntry: false });
        this.pendingJump = null;
        attackButton.setIconOverride(null);
        this.isShowingJumpIcon = false;
      }
    } else {
      this.pendingJump = null;
      if (this.isShowingJumpIcon) {
        attackButton?.setIconOverride(null);
        this.isShowingJumpIcon = false;
      }
    }

    this.detector.updatePrevPosition(this.entity);
  }
}
