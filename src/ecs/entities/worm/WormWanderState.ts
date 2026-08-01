import type { IState } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { Direction } from '../../../constants/Direction';
import { getWormAnimKey } from './WormAnimations';
import type { GridReader } from '../../../systems/grid/Grid';
import { getPlayerFeetCell } from '../../../utils/PlayerPositionHelper';

const WANDER_SPEED_PX_PER_SEC = 40;
const WANDER_MOVE_MIN_MS = 800;
const WANDER_MOVE_MAX_MS = 1500;
const WANDER_PAUSE_MIN_MS = 500;
const WANDER_PAUSE_MAX_MS = 1200;
const SPIT_DETECT_DISTANCE_PX = 350;
const SPIT_COOLDOWN_MS = 4500;
const SPIT_INITIAL_DELAY_MS = 1500;

const CARDINAL_DIRS: Direction[] = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
const DIR_DELTAS: Record<number, { dx: number; dy: number }> = {
  [Direction.Up]: { dx: 0, dy: -1 },
  [Direction.Down]: { dx: 0, dy: 1 },
  [Direction.Left]: { dx: -1, dy: 0 },
  [Direction.Right]: { dx: 1, dy: 0 },
};

export class WormWanderState implements IState {
  private elapsedMs = 0;
  private durationMs = 0;
  private isPaused = true;
  private direction = Direction.Down;
  private spitCooldownMs = SPIT_INITIAL_DELAY_MS;
  private currentAnimKey = '';

  constructor(
    private readonly entity: Entity,
    private readonly playerEntity: Entity,
    private readonly grid: GridReader
  ) {}

  onEnter(): void {
    this.isPaused = true;
    this.elapsedMs = 0;
    this.durationMs = this.randomPauseDuration();
    this.playAnim('idle');
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;
    this.spitCooldownMs -= delta;

    // Check if player is in spit range
    if (this.spitCooldownMs <= 0 && this.canSeePlayer()) {
      this.spitCooldownMs = SPIT_COOLDOWN_MS;
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('spit');
      return;
    }

    if (this.elapsedMs >= this.durationMs) {
      this.elapsedMs = 0;
      if (this.isPaused) {
        this.isPaused = false;
        this.direction = CARDINAL_DIRS[Math.floor(Math.random() * CARDINAL_DIRS.length)];
        this.durationMs = this.randomMoveDuration();
        this.playAnim('walk');
      } else {
        this.isPaused = true;
        this.durationMs = this.randomPauseDuration();
        this.playAnim('idle');
      }
    }

    if (!this.isPaused) {
      const transform = this.entity.require(TransformComponent);
      const delta2 = DIR_DELTAS[this.direction];
      if (delta2) {
        transform.x += delta2.dx * WANDER_SPEED_PX_PER_SEC * (delta / 1000);
        transform.y += delta2.dy * WANDER_SPEED_PX_PER_SEC * (delta / 1000);
      }
    }
  }

  private canSeePlayer(): boolean {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const dist = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    if (dist > SPIT_DETECT_DISTANCE_PX) return false;

    // Check path exists (not through walls)
    const wormCell = this.grid.worldToCell(transform.x, transform.y);
    const playerCell = getPlayerFeetCell(this.playerEntity, this.grid);
    const gridPos = this.entity.get(GridPositionComponent);
    const layer = gridPos?.currentLayer ?? 0;

    // Simple line-of-sight: check if player is roughly in a cardinal direction
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Must be roughly aligned on one axis (within 1.5 cells tolerance)
    const cellSize = this.grid.cellSize;
    if (absDx < cellSize * 1.5 || absDy < cellSize * 1.5) {
      // Check no walls between worm and player along the dominant axis
      return this.hasLineOfSight(wormCell, playerCell, layer);
    }
    return false;
  }

  private hasLineOfSight(from: { col: number; row: number }, to: { col: number; row: number }, layer: number): boolean {
    const dc = Math.sign(to.col - from.col);
    const dr = Math.sign(to.row - from.row);
    // Walk along dominant axis
    if (Math.abs(to.col - from.col) >= Math.abs(to.row - from.row)) {
      for (let c = from.col + dc; c !== to.col; c += dc) {
        const cell = this.grid.getCell(c, from.row);
        if (!cell || cell.layer > layer) return false;
        if (cell.properties?.has('wall')) return false;
      }
    } else {
      for (let r = from.row + dr; r !== to.row; r += dr) {
        const cell = this.grid.getCell(from.col, r);
        if (!cell || cell.layer > layer) return false;
        if (cell.properties?.has('wall')) return false;
      }
    }
    return true;
  }

  private playAnim(type: string): void {
    const key = getWormAnimKey(type, this.direction);
    if (this.currentAnimKey !== key) {
      this.currentAnimKey = key;
      this.entity.require(SpriteComponent).sprite.play(key);
    }
  }

  private randomPauseDuration(): number {
    return WANDER_PAUSE_MIN_MS + Math.random() * (WANDER_PAUSE_MAX_MS - WANDER_PAUSE_MIN_MS);
  }

  private randomMoveDuration(): number {
    return WANDER_MOVE_MIN_MS + Math.random() * (WANDER_MOVE_MAX_MS - WANDER_MOVE_MIN_MS);
  }
}
