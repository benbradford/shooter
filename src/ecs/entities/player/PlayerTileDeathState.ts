import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { AnimationComponent } from '../../components/core/AnimationComponent';
import { WalkComponent } from '../../components/movement/WalkComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { TransformComponent } from '../../components/core/TransformComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import type { Grid } from '../../../systems/grid/Grid';

const DEATH_ANIM_DURATION_MS = 1000;
const FADE_DURATION_MS = 500;
const RESPAWN_DELAY_MS = 300;
const CAMERA_PAN_DURATION_MS = 600;

export class PlayerTileDeathState implements IState {
  private elapsedMs = 0;
  private phase: 'dying' | 'fading' | 'panning' | 'done' = 'dying';
  private respawnCol = 0;
  private respawnRow = 0;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {}

  setRespawnCell(col: number, row: number): void {
    this.respawnCol = col;
    this.respawnRow = row;
  }

  onEnter(): void {
    this.elapsedMs = 0;
    this.phase = 'dying';

    const walk = this.entity.require(WalkComponent);
    const anim = this.entity.require(AnimationComponent);

    walk.setEnabled(false);
    anim.animationSystem.play(`death_${walk.lastDir}`);

    // Disable collision while in tile death
    const collision = this.entity.get(GridCollisionComponent);
    if (collision) collision.enabled = false;
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    if (this.phase === 'dying' && this.elapsedMs >= DEATH_ANIM_DURATION_MS) {
      this.phase = 'fading';
      this.elapsedMs = 0;
    }

    if (this.phase === 'fading') {
      const fadeProgress = Math.min(1, this.elapsedMs / FADE_DURATION_MS);
      const sprite = this.entity.require(SpriteComponent);
      sprite.sprite.setAlpha(1 - fadeProgress);

      if (fadeProgress >= 1) {
        this.phase = 'panning';
        this.elapsedMs = 0;
        this.teleportToRespawn();
        this.panCamera();
      }
    }

    if (this.phase === 'panning') {
      if (this.elapsedMs >= CAMERA_PAN_DURATION_MS + RESPAWN_DELAY_MS) {
        this.phase = 'done';
        this.finishRespawn();
      }
    }
  }

  private teleportToRespawn(): void {
    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);

    const worldPos = this.grid.cellToWorld(this.respawnCol, this.respawnRow);
    transform.x = worldPos.x + this.grid.cellSize / 2;
    transform.y = worldPos.y + this.grid.cellSize / 2;

    gridPos.currentCell.col = this.respawnCol;
    gridPos.currentCell.row = this.respawnRow;

    const collision = this.entity.get(GridCollisionComponent);
    if (collision) {
      collision.syncPreviousPosition(transform.x, transform.y);
    }
  }

  private panCamera(): void {
    const transform = this.entity.require(TransformComponent);
    const camera = this.scene.cameras.main;

    camera.stopFollow();
    camera.pan(transform.x, transform.y, CAMERA_PAN_DURATION_MS, 'Sine.easeInOut', false, (_cam, progress) => {
      if (progress >= 1) {
        camera.startFollow(this.entity.require(SpriteComponent).sprite, true, 0.1, 0.1);
      }
    });
  }

  private finishRespawn(): void {
    const sprite = this.entity.require(SpriteComponent);
    const walk = this.entity.require(WalkComponent);
    const collision = this.entity.get(GridCollisionComponent);
    const anim = this.entity.require(AnimationComponent);

    sprite.sprite.setAlpha(1);
    walk.setEnabled(true);
    if (collision) {
      collision.enabled = true;
      collision.onMovingTile = false;
    }

    anim.animationSystem.play(`idle_${walk.lastDir}`);

    const sm = this.entity.require(StateMachineComponent);
    sm.stateMachine.enter('idle');
  }
}
