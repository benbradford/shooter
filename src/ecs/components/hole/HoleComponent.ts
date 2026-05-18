import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { InputComponent } from '../input/InputComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { WorldFlags } from '../../../constants/WorldFlags';

const HOP_DURATION_MS = 300;
const HOP_HEIGHT_PX = 20;
const FALL_DURATION_MS = 400;
const FALL_MIN_SCALE = 0;

export type HoleComponentProps = {
  col: number;
  row: number;
  grid: GridReader;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
};

export class HoleComponent implements Component {
  entity!: Entity;
  private readonly col: number;
  private readonly row: number;
  private readonly grid: GridReader;
  private readonly targetLevel: string;
  private readonly targetCol: number;
  private readonly targetRow: number;
  private readonly onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;

  private phase: 'idle' | 'hopping' | 'falling' | 'done' = 'idle';
  private hopProgress = 0;
  private fallProgress = 0;
  private hopStartX = 0;
  private hopStartY = 0;
  private hopTargetX = 0;
  private hopTargetY = 0;
  private playerEntity: Entity | null = null;

  constructor(props: HoleComponentProps) {
    this.col = props.col;
    this.row = props.row;
    this.grid = props.grid;
    this.targetLevel = props.targetLevel;
    this.targetCol = props.targetCol;
    this.targetRow = props.targetRow;
    this.onTransition = props.onTransition;
  }

  update(delta: number): void {
    if (this.phase === 'hopping' && this.playerEntity) {
      this.animateHop(delta);
      return;
    }

    if (this.phase === 'falling' && this.playerEntity) {
      this.animateFall(delta);
      return;
    }

    if (this.phase !== 'idle') return;

    // Detect player entering hole cell
    const player = this.grid.getFirstEntityWithTag('player');
    if (!player) return;

    const gridPos = player.get(GridPositionComponent);
    if (!gridPos) return;

    if (gridPos.currentCell.col === this.col && gridPos.currentCell.row === this.row) {
      this.triggerHop(player);
    }
  }

  private triggerHop(player: Entity): void {
    this.phase = 'hopping';
    this.playerEntity = player;

    const input = player.get(InputComponent);
    input?.setEnabled(false);

    const walk = player.get(WalkComponent);
    if (walk) {
      walk.setEnabled(false);
      walk.resetVelocity(true, true);
    }

    const transform = player.require(TransformComponent);
    this.hopStartX = transform.x;
    this.hopStartY = transform.y;

    const cellWorld = this.grid.cellToWorld(this.col, this.row);
    this.hopTargetX = cellWorld.x + this.grid.cellSize / 2;
    this.hopTargetY = cellWorld.y + this.grid.cellSize / 2 - 10;

    this.hopProgress = 0;
  }

  private animateHop(delta: number): void {
    if (!this.playerEntity) return;

    this.hopProgress = Math.min(1, this.hopProgress + delta / HOP_DURATION_MS);

    const transform = this.playerEntity.require(TransformComponent);
    transform.x = this.hopStartX + (this.hopTargetX - this.hopStartX) * this.hopProgress;
    transform.y = this.hopStartY + (this.hopTargetY - this.hopStartY) * this.hopProgress;

    // Sine wave hop arc
    const hopOffset = Math.sin(this.hopProgress * Math.PI) * -HOP_HEIGHT_PX;
    const sprite = this.playerEntity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.y = transform.y + hopOffset;
    }

    // Hop complete → start falling
    if (this.hopProgress >= 1) {
      this.phase = 'falling';
      this.fallProgress = 0;
      WorldStateManager.getInstance().setFlag(WorldFlags.enteredViaHole, 'true');
      this.onTransition(this.targetLevel, this.targetCol, this.targetRow);
    }
  }

  private animateFall(delta: number): void {
    if (!this.playerEntity) return;

    this.fallProgress = Math.min(1, this.fallProgress + delta / FALL_DURATION_MS);

    const transform = this.playerEntity.require(TransformComponent);
    const sprite = this.playerEntity.get(SpriteComponent);
    if (!sprite) return;

    // Shrink toward zero
    const scale = transform.scale * (1 - this.fallProgress * (1 - FALL_MIN_SCALE));
    sprite.sprite.setScale(scale);

    // Sink sprite downward slightly as it shrinks
    sprite.sprite.y = transform.y + this.fallProgress * 8;

    if (this.fallProgress >= 1) {
      this.phase = 'done';
    }
  }
}
