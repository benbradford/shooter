import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { Pathfinder } from '../../../systems/Pathfinder';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { Direction } from '../../../constants/Direction';

const DIRECTION_MAP: Record<string, Direction> = {
  'down': Direction.Down,
  'up': Direction.Up,
  'left': Direction.Left,
  'right': Direction.Right,
  'down_left': Direction.DownLeft,
  'down_right': Direction.DownRight,
  'up_left': Direction.UpLeft,
  'up_right': Direction.UpRight
};

export class InteractionComponent implements Component {
  entity!: Entity;
  public isActive = false;
  private currentPath: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private targetSpeed = 0;
  private moveResolve: (() => void) | null = null;
  private readonly pathfinder: Pathfinder;
  private currentAnimKey = '';
  
  constructor(private readonly grid: Grid) {
    this.pathfinder = new Pathfinder(grid);
  }
  
  async moveTo(col: number, row: number, speedPxPerSec: number): Promise<void> {
    const transform = this.entity.require(TransformComponent);
    const gridPos = this.entity.require(GridPositionComponent);
    
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    
    const path = this.pathfinder.findPath(
      startCell.col,
      startCell.row,
      col,
      row,
      gridPos.currentLayer,
      false,
      true
    );
    
    if (!path || path.length === 0) {
      throw new Error(`[InteractionComponent] No path found to (${col}, ${row})`);
    }
    
    this.currentPath = path;
    this.currentPathIndex = 1;
    this.targetSpeed = speedPxPerSec;
    this.isActive = true;
    
    return new Promise<void>(resolve => {
      this.moveResolve = resolve;
    });
  }
  
  look(direction: string): void {
    const dir = DIRECTION_MAP[direction];
    if (dir === undefined) {
      throw new Error(`[InteractionComponent] Invalid direction: ${direction}`);
    }
    
    const animation = this.entity.get(AnimationComponent);
    if (animation) {
      animation.animationSystem.play(`idle_${dir}`);
    }
  }
  
  update(delta: number): void {
    if (!this.isActive || !this.currentPath || !this.moveResolve) return;
    
    const transform = this.entity.require(TransformComponent);
    
    if (this.currentPathIndex >= this.currentPath.length) {
      this.isActive = false;
      this.currentPath = null;
      this.currentAnimKey = '';
      
      const animation = this.entity.get(AnimationComponent);
      if (animation) {
        const gridPos = this.entity.require(GridPositionComponent);
        const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
        const isInWater = cell?.properties.has('water') ?? false;
        const animPrefix = isInWater ? 'swim' : 'idle';
        const dir = this.getDirectionFromDelta(0, -1);
        animation.animationSystem.play(`${animPrefix}_${dir}`);
      }
      
      this.moveResolve();
      this.moveResolve = null;
      return;
    }
    
    const targetNode = this.currentPath[this.currentPathIndex];
    const targetWorld = this.grid.cellToWorld(targetNode.col, targetNode.row);
    const targetX = targetWorld.x + this.grid.cellSize / 2;
    const targetY = targetWorld.y + this.grid.cellSize / 2;
    
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance < 20) {
      this.currentPathIndex++;
      return;
    }
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    const moveDistance = this.targetSpeed * (delta / 1000);
    
    transform.x += dirX * moveDistance;
    transform.y += dirY * moveDistance;
    
    const animation = this.entity.get(AnimationComponent);
    if (animation) {
      const gridPos = this.entity.require(GridPositionComponent);
      const cell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
      const isInWater = cell?.properties.has('water') ?? false;
      const animPrefix = isInWater ? 'swim' : 'walk';
      const dir = this.getDirectionFromDelta(dirX, dirY);
      const animKey = `${animPrefix}_${dir}`;
      
      if (animKey !== this.currentAnimKey) {
        this.currentAnimKey = animKey;
        animation.animationSystem.play(animKey);
      }
    }
  }
  
  private getDirectionFromDelta(dx: number, dy: number): Direction {
    const angle = Math.atan2(dy, dx);
    const deg = angle * 180 / Math.PI;
    
    if (deg >= -22.5 && deg < 22.5) return Direction.Right;
    if (deg >= 22.5 && deg < 67.5) return Direction.DownRight;
    if (deg >= 67.5 && deg < 112.5) return Direction.Down;
    if (deg >= 112.5 && deg < 157.5) return Direction.DownLeft;
    if (deg >= 157.5 || deg < -157.5) return Direction.Left;
    if (deg >= -157.5 && deg < -112.5) return Direction.UpLeft;
    if (deg >= -112.5 && deg < -67.5) return Direction.Up;
    return Direction.UpRight;
  }
}
