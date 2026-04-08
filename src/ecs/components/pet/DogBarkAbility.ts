import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { FearComponent } from '../combat/FearComponent';
import { PetFollowComponent } from './PetFollowComponent';
import { BugHopComponent } from '../movement/BugHopComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';
import { Depth } from '../../../constants/DepthConstants';
import { Pathfinder } from '../../../systems/Pathfinder';
import type { Grid } from '../../../systems/grid/Grid';

const FEAR_DURATION_MS = 4000;

const ENEMY_DETECT_RANGE_PX = 400;
const MAX_BARK_TARGET_PATH_CELLS = 6;
const BARK_RANGE_PX = 100;
const FEAR_RADIUS_PX = 400;
const BARK_ANIM_DURATION_MS = 1500;
const APPROACH_SPEED_PX_PER_SEC = 300;
const APPROACH_PATH_RECALC_MS = 500;
const BARK_WAVE_DURATION_MS = 480;
const BARK_WAVE_LINE_WIDTH_PX = 5;
const BARK_WAVE_INITIAL_ALPHA = 0.5;

type BarkState = 'idle' | 'approaching' | 'barking';

export class DogBarkAbility implements Component {
  entity!: Entity;
  private state: BarkState = 'idle';
  private targetEntity: Entity | null = null;
  private barkTimerMs = 0;
  private approachPath: Array<{ col: number; row: number }> | null = null;
  private approachPathIndex = 0;
  private approachPathTimerMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid
  ) {}

  isActive(): boolean {
    return this.state !== 'idle';
  }

  getNearestEnemyInRange(): Entity | null {
    const transform = this.entity.require(TransformComponent);
    const gameScene = this.scene as unknown as { entityManager?: { getAll(): Entity[] } };
    const entities = gameScene.entityManager?.getAll() ?? [];
    const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
    const dogCell = this.grid.worldToCell(transform.x, transform.y);

    let nearest: Entity | null = null;
    let nearestPathLen = MAX_BARK_TARGET_PATH_CELLS + 1;

    for (const e of entities) {
      if (e.isDestroyed || !e.tags.has('enemy')) continue;
      if (e.id.startsWith('bugbase')) continue;

      const sm = e.get(StateMachineComponent);
      if (sm) {
        const key = sm.stateMachine.getCurrentKey();
        if (key === 'death' || key === 'dying') continue;
      }

      const et = e.get(TransformComponent);
      if (!et) continue;

      // Quick pixel distance pre-filter
      if (Math.hypot(et.x - transform.x, et.y - transform.y) > ENEMY_DETECT_RANGE_PX) continue;

      const enemyCell = this.grid.worldToCell(et.x, et.y);
      const path = pathfinder.findPath(dogCell.col, dogCell.row, enemyCell.col, enemyCell.row, 0, false, true);
      if (!path) continue;

      if (path.length < nearestPathLen) {
        nearestPathLen = path.length;
        nearest = e;
      }
    }

    return nearest;
  }

  activate(target: Entity): void {
    this.targetEntity = target;
    this.state = 'approaching';
    const follow = this.entity.get(PetFollowComponent);
    follow?.setBarking(true);
  }

  update(delta: number): void {
    if (this.state === 'approaching') {
      this.updateApproaching(delta);
    } else if (this.state === 'barking') {
      this.updateBarking(delta);
    }
  }

  private updateApproaching(delta: number): void {
    if (!this.targetEntity || this.targetEntity.isDestroyed) {
      this.returnToIdle();
      return;
    }

    const sm = this.targetEntity.get(StateMachineComponent);
    if (sm) {
      const key = sm.stateMachine.getCurrentKey();
      if (key === 'death' || key === 'dying') {
        this.returnToIdle();
        return;
      }
    }

    const transform = this.entity.require(TransformComponent);
    const targetTransform = this.targetEntity.require(TransformComponent);
    const dx = targetTransform.x - transform.x;
    const dy = targetTransform.y - transform.y;
    const distPx = Math.hypot(dx, dy);

    if (distPx <= BARK_RANGE_PX) {
      this.startBarking(dx, dy);
      return;
    }

    // Pathfinding to target
    this.approachPathTimerMs += delta;
    if (!this.approachPath || this.approachPathTimerMs >= APPROACH_PATH_RECALC_MS) {
      this.approachPathTimerMs = 0;
      const pathfinder = new Pathfinder(this.grid, this.grid.getBlockedAreaCells());
      const startCell = this.grid.worldToCell(transform.x, transform.y);
      const goalCell = this.grid.worldToCell(targetTransform.x, targetTransform.y);
      this.approachPath = pathfinder.findPath(startCell.col, startCell.row, goalCell.col, goalCell.row, 0, false, true);
      this.approachPathIndex = 1;
    }

    if (this.approachPath && this.approachPathIndex < this.approachPath.length) {
      const node = this.approachPath[this.approachPathIndex];
      const nodeX = node.col * this.grid.cellSize + this.grid.cellSize / 2;
      const nodeY = node.row * this.grid.cellSize + this.grid.cellSize / 2;
      const nodeDx = nodeX - transform.x;
      const nodeDy = nodeY - transform.y;
      const nodeDist = Math.hypot(nodeDx, nodeDy);

      if (nodeDist < 10) {
        this.approachPathIndex++;
      } else {
        const movePx = APPROACH_SPEED_PX_PER_SEC * (delta / 1000);
        transform.x += (nodeDx / nodeDist) * Math.min(movePx, nodeDist);
        transform.y += (nodeDy / nodeDist) * Math.min(movePx, nodeDist);

        const dir = dirFromDelta(nodeDx, nodeDy);
        if (dir !== Direction.None) {
          const anim = this.entity.get(AnimationComponent);
          anim?.animationSystem.play(`walk_${dir}`);
        }
      }
    }
  }

  private startBarking(dx: number, dy: number): void {
    this.state = 'barking';
    this.barkTimerMs = 0;

    const dir = dirFromDelta(dx, dy);
    const anim = this.entity.get(AnimationComponent);
    if (anim && dir !== Direction.None) {
      anim.animationSystem.play(`bark_${dir}`);
    }

    this.applyFearToNearbyEnemies();
    this.createBarkWave();
  }

  private updateBarking(delta: number): void {
    this.barkTimerMs += delta;
    if (this.barkTimerMs >= BARK_ANIM_DURATION_MS) {
      this.returnToIdle();
    }
  }

  private returnToIdle(): void {
    this.state = 'idle';
    this.targetEntity = null;
    this.barkTimerMs = 0;
    this.approachPath = null;
    const follow = this.entity.get(PetFollowComponent);
    follow?.setBarking(false);

    const anim = this.entity.get(AnimationComponent);
    anim?.animationSystem.play(`idle_${Direction.Down}`);
  }

  private applyFearToNearbyEnemies(): void {
    const transform = this.entity.require(TransformComponent);
    const gameScene = this.scene as unknown as { entityManager?: { getAll(): Entity[] } };
    const entities = gameScene.entityManager?.getAll() ?? [];

    for (const e of entities) {
      if (e.isDestroyed || !e.tags.has('enemy')) continue;
      if (e.id.startsWith('bugbase')) continue;

      const sm = e.get(StateMachineComponent);
      if (sm) {
        const key = sm.stateMachine.getCurrentKey();
        if (key === 'death' || key === 'dying') continue;
      }

      const et = e.get(TransformComponent);
      if (!et) continue;

      const distPx = Math.hypot(et.x - transform.x, et.y - transform.y);
      if (distPx > FEAR_RADIUS_PX) continue;

      if (!sm?.stateMachine.hasState('fear')) continue;

      const existingFear = e.get(FearComponent);
      if (existingFear) {
        existingFear.resetTimer();
      } else {
        const currentState = sm.stateMachine.getCurrentKey() ?? 'idle';
        const NON_RESUMABLE_STATES = new Set(['attack', 'jumping', 'recover', 'standup', 'threatening']);
        const safeState = NON_RESUMABLE_STATES.has(currentState)
          ? (sm.stateMachine.hasState('chasing') ? 'chasing' : sm.stateMachine.hasState('chase') ? 'chase' : 'idle')
          : currentState;
        const returnState = safeState;
        const fear = e.add(new FearComponent({
          sourceX: transform.x,
          sourceY: transform.y,
          durationMs: FEAR_DURATION_MS,
          returnState,
          scene: this.scene
        }));
        fear.init();
      }

      // Cancel any active hop (bugs)
      const hop = e.get(BugHopComponent);
      if (hop) hop.cancel();

      sm.stateMachine.enter('fear');
    }
  }

  private createBarkWave(): void {
    const transform = this.entity.require(TransformComponent);
    const x = transform.x;
    const y = transform.y;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(Depth.particle);

    let elapsedMs = 0;

    const tick = (_time: number, delta: number): void => {
      elapsedMs += delta;
      const progress = Math.min(elapsedMs / BARK_WAVE_DURATION_MS, 1);
      const radiusPx = FEAR_RADIUS_PX * progress;
      const alpha = BARK_WAVE_INITIAL_ALPHA * (1 - progress);

      graphics.clear();
      graphics.lineStyle(BARK_WAVE_LINE_WIDTH_PX, 0xffffff, alpha);
      graphics.strokeCircle(x, y, radiusPx);

      if (progress >= 1) {
        this.scene.events.off('update', tick);
        graphics.destroy();
      }
    };

    this.scene.events.on('update', tick);
  }
}
