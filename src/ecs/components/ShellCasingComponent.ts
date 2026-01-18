import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import { SpriteComponent } from './SpriteComponent';

export class ShellCasingComponent implements Component {
  entity!: Entity;
  private elapsedTime: number = 0;
  private phase: 'flying' | 'bouncing' | 'fading' = 'flying';
  private bounceStartTime: number = 0;
  private velocityY: number = -0.3;  // Initial upward velocity
  private velocityX: number;
  private rotationSpeed: number;
  private readonly gravity: number = 0.0008;  // Gravity pulls down
  private bounceCount: number = 0;
  private readonly maxBounces: number = 2;
  private floorY: number;
  
  constructor(
    _direction: 'left' | 'right',
    floorY: number,
    private readonly sprite: SpriteComponent
  ) {
    // Random horizontal velocity: ±60 pixels from player
    const horizontalRange = 60;
    const randomHorizontal = (Math.random() * horizontalRange * 2) - horizontalRange;
    this.velocityX = randomHorizontal / 1000;  // Spread over time
    
    // Randomize floor Y position by ±15 pixels
    this.floorY = floorY + (Math.random() * 30 - 15);
    
    // Rotation speed based on horizontal distance (more distance = faster spin)
    // Positive velocityX = moving right = clockwise, negative = left = anticlockwise
    const baseRotationSpeed = 0.008;
    this.rotationSpeed = baseRotationSpeed * Math.abs(randomHorizontal) / 30;
    if (randomHorizontal < 0) {
      this.rotationSpeed *= -1;  // Anticlockwise for left
    }
  }
  
  update(delta: number): void {
    this.elapsedTime += delta;
    const transform = this.entity.get(TransformComponent)!;
    
    if (this.phase === 'flying' || this.phase === 'bouncing') {
      // Apply gravity to vertical velocity
      this.velocityY += this.gravity * delta;
      
      // Update position based on velocity
      transform.x += this.velocityX * delta;
      transform.y += this.velocityY * delta;
      
      // Rotation based on horizontal distance
      transform.rotation += this.rotationSpeed * delta;
      
      // Check if reached floor (with random Y offset ±10)
      if (transform.y >= this.floorY) {
        this.bounceCount++;
        
        if (this.bounceCount === 1) {
          // First bounce - start fading
          this.phase = 'fading';
          this.bounceStartTime = this.elapsedTime;
          transform.y = this.floorY + (Math.random() * 20 - 10);  // ±10 pixels
          // Small bounce
          this.velocityY = -0.15;  // Half the initial velocity
          this.velocityX *= 0.5;   // Reduce horizontal speed
        } else if (this.bounceCount < this.maxBounces) {
          // Subsequent small bounces
          this.phase = 'bouncing';
          transform.y = this.floorY;
          this.velocityY = -0.08;  // Smaller bounce
          this.velocityX *= 0.7;
        } else {
          // Stop bouncing
          transform.y = this.floorY;
          this.velocityY = 0;
          this.velocityX = 0;
        }
      }
    } else if (this.phase === 'fading') {
      // Continue physics during fade only if still bouncing
      if (this.bounceCount < this.maxBounces) {
        this.velocityY += this.gravity * delta;
        transform.x += this.velocityX * delta;
        transform.y += this.velocityY * delta;
        transform.rotation += this.rotationSpeed * delta;
        
        // Bounce if needed
        if (transform.y >= this.floorY) {
          this.bounceCount++;
          transform.y = this.floorY;
          this.velocityY = -0.08;
          this.velocityX *= 0.7;
        }
      } else {
        // Stop all movement after max bounces
        transform.y = this.floorY;
      }
      
      // Fade over 2 seconds
      const fadeDuration = 2000;
      const fadeProgress = (this.elapsedTime - this.bounceStartTime) / fadeDuration;
      
      this.sprite.sprite.setAlpha(1 - fadeProgress);
      
      if (fadeProgress >= 1) {
        this.entity.destroy();
      }
    }
  }
  
  onDestroy(): void {}
}
