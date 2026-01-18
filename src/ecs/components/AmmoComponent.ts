import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { HudBarDataSource } from './HudBarComponent';

export class AmmoComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentAmmo: number = 20;
  private readonly maxAmmo: number = 20;
  private readonly refillRate: number = 10; // per second
  private readonly refillDelay: number = 2000; // 2 seconds
  private lastFireTime: number = 0;
  private isOverheated: boolean = false;

  canFire(): boolean {
    return this.currentAmmo > 0 && !this.isOverheated;
  }

  consumeAmmo(): void {
    if (this.currentAmmo > 0) {
      this.currentAmmo--;
      this.lastFireTime = Date.now();

      if (this.currentAmmo === 0) {
        this.isOverheated = true;
      }
    }
  }

  update(delta: number): void {
    const timeSinceLastFire = Date.now() - this.lastFireTime;

    // Start refilling after delay
    if (timeSinceLastFire >= this.refillDelay && this.currentAmmo < this.maxAmmo) {
      const refillAmount = (this.refillRate * delta) / 1000;
      this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + refillAmount);

      // Clear overheat when fully refilled
      if (this.currentAmmo >= this.maxAmmo) {
        this.isOverheated = false;
      }
    }
  }

  getAmmoRatio(): number {
    return this.currentAmmo / this.maxAmmo;
  }

  getRatio(): number {
    return this.getAmmoRatio();
  }

  isGunOverheated(): boolean {
    return this.isOverheated;
  }

  onDestroy(): void {}
}
