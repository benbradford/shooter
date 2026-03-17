import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { AnimationComponent } from '../core/AnimationComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { Pathfinder } from '../../../systems/Pathfinder';
import { Direction, dirFromDelta } from '../../../constants/Direction';

const FOLLOW_SPEED_PX_PER_SEC = 300;
const STOP_DISTANCE_PX = 128;
const TELEPORT_DISTANCE_PX = 800;
const ABILITY_DISABLE_DISTANCE_PX = 250;
const PATH_RECALC_MS = 1000;
const USE_PATHFINDING_DISTANCE_PX = 200;

export class PetFollowComponent implements Component {
  entity!: Entity;
  
  private isFollowing = false;
  private isHidden = false;
  private isBarking = false;
  private wasInWater = false;
  
  private path: Array<{ col: number; row: number }> | null = null;
  private currentPathIndex = 0;
  private pathRecalcTimerMs = 0;
  private currentDirection: Direction = Direction.Down;
  
  constructor(
    private readonly grid: Grid,
    private readonly playerEntity: Entity
  ) {}
  
  update(delta: number): void {
    // Check if player is in water
    const water = this.playerEntity.get(WaterEffectComponent);
    
    if (water) {
      const isInWater = water.getIsInWater();
      
      if (isInWater !== this.wasInWater) {
        this.wasInWater = isInWater;
        this.isHidden = isInWater;
        
        const sprite = this.entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.setAlpha(isInWater ? 0 : 1);
        }
      }
    }
    
    if (this.isHidden || this.isBarking) return;
    
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const anim = this.entity.require(AnimationComponent);
    
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distancePx = Math.hypot(dx, dy);
    
    if (distancePx > TELEPORT_DISTANCE_PX) {
      transform.x = playerTransform.x;
      transform.y = playerTransform.y;
      this.isFollowing = false;
      this.path = null;
      anim.animationSystem.play(`idle_${this.currentDirection}`);
      return;
    }
    
    if (distancePx <= STOP_DISTANCE_PX) {
      if (this.isFollowing) {
        this.isFollowing = false;
        const faceDir = dirFromDelta(dx, dy);
        if (faceDir !== Direction.None) this.currentDirection = faceDir;
        anim.animationSystem.play(`idle_${this.currentDirection}`);
      }
      return;
    }
    
    if (!this.isFollowing) {
      this.isFollowing = true;
      const newDir = dirFromDelta(dx, dy);
      if (newDir !== Direction.None) {
        this.currentDirection = newDir;
        anim.animationSystem.play(`walk_${this.currentDirection}`);
      }
    }
    
    // Use pathfinding only if player is far or not directly reachable
    if (distancePx > USE_PATHFINDING_DISTANCE_PX) {
      this.pathRecalcTimerMs += delta;
      
      if (!this.path || this.pathRecalcTimerMs >= PATH_RECALC_MS) {
        this.recalculatePath();
        this.pathRecalcTimerMs = 0;
      }
      
      if (this.path && this.path.length > 0) {
        this.followPath(delta, transform, anim);
        return;
      }
    }
    
    // Direct movement toward player
    this.moveToward(transform, playerTransform.x, playerTransform.y, delta, anim);
  }
  
  private recalculatePath(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    
    const startCell = this.grid.worldToCell(transform.x, transform.y);
    const goalCell = this.grid.worldToCell(playerTransform.x, playerTransform.y);
    
    const pathfinder = new Pathfinder(this.grid);
    const startCellData = this.grid.getCell(startCell.col, startCell.row);
    const currentLayer = startCellData?.layer ?? 0;
    
    this.path = pathfinder.findPath(
      startCell.col, startCell.row,
      goalCell.col, goalCell.row,
      currentLayer, true, true
    );
    this.currentPathIndex = 1;
  }
  
  private followPath(delta: number, transform: TransformComponent, anim: AnimationComponent): void {
    if (!this.path || this.currentPathIndex >= this.path.length) {
      this.path = null;
      return;
    }
    
    const target = this.path[this.currentPathIndex];
    const targetX = target.col * this.grid.cellSize + this.grid.cellSize / 2;
    const targetY = target.row * this.grid.cellSize + this.grid.cellSize / 2;
    
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 32) {
      this.currentPathIndex++;
      return;
    }
    
    this.moveToward(transform, targetX, targetY, delta, anim);
  }
  
  private moveToward(
    transform: TransformComponent,
    targetX: number, targetY: number,
    delta: number, anim: AnimationComponent
  ): void {
    const dx = targetX - transform.x;
    const dy = targetY - transform.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 1) return;
    
    const moveDist = FOLLOW_SPEED_PX_PER_SEC * (delta / 1000);
    
    if (moveDist >= dist) {
      transform.x = targetX;
      transform.y = targetY;
    } else {
      transform.x += (dx / dist) * moveDist;
      transform.y += (dy / dist) * moveDist;
    }
    
    const newDir = dirFromDelta(dx, dy);
    if (newDir !== Direction.None && newDir !== this.currentDirection) {
      this.currentDirection = newDir;
      anim.animationSystem.play(`walk_${this.currentDirection}`);
    }
  }
  
  getIsTooFar(): boolean { 
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distancePx = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
    return distancePx > ABILITY_DISABLE_DISTANCE_PX;
  }
  
  getIsHidden(): boolean { 
    return this.isHidden; 
  }
  
  setHidden(hidden: boolean): void { 
    this.isHidden = hidden; 
  }

  setBarking(barking: boolean): void {
    this.isBarking = barking;
  }

  getIsBarking(): boolean {
    return this.isBarking;
  }
}
