import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { TransformComponent } from '../core/TransformComponent';
import { ShadowComponent } from './ShadowComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private hopProgress: number = 1;
  private hopDirX: number = 0;
  private hopDirY: number = 0;
  
  isHopping(): boolean {
    return this.hopProgress < 1;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    const shadow = this.entity.get(ShadowComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);
    const walk = this.entity.get(WalkComponent);
    
    if (!sprite || !transform || !gridPos || !gridCollision) return;
    
    const grid = gridCollision.getGrid();
    const cell = grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    const nowInWater = cell?.properties.has('water') ?? false;
    
    if (shadow) {
      shadow.shadow.setVisible(!nowInWater);
    }
    
    // Detect water entry/exit
    if (nowInWater !== this.isInWater) {
      this.isInWater = nowInWater;
      this.hopProgress = 0;
      
      if (walk) {
        const velX = walk.getVelocityX();
        const velY = walk.getVelocityY();
        const length = Math.hypot(velX, velY);
        
        if (length > 0) {
          this.hopDirX = velX / length;
          this.hopDirY = velY / length;
        } else {
          this.hopDirX = 0;
          this.hopDirY = 0;
        }
      }
    }
    
    // Continue movement during hop at fixed speed
    const HOP_SPEED_PX_PER_SEC = 200;
    if (this.hopProgress < 1) {
      transform.x += this.hopDirX * HOP_SPEED_PX_PER_SEC * (delta / 1000);
      transform.y += this.hopDirY * HOP_SPEED_PX_PER_SEC * (delta / 1000);
    }
    
    // Animate hop
    if (this.hopProgress < 1) {
      this.hopProgress = Math.min(1, this.hopProgress + delta / 300);
      
      const hopHeight = Math.sin(this.hopProgress * Math.PI) * -20;
      sprite.sprite.y = transform.y + hopHeight;
    } else {
      sprite.sprite.y = transform.y;
    }
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
