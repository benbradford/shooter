import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HudBarDataSource } from '../ui/HudBarComponent';

export interface AmmoProps {
  maxAmmo: number;
  refillRate: number;
  refillDelay: number;
  overheatedRefillDelay: number;
}

export class AmmoComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentAmmo: number;
  private readonly maxAmmo: number;
  private readonly refillRate: number;
  private readonly refillDelay: number;
  private readonly overheatedRefillDelay: number;
  private lastFireTime: number = 0;
  private isOverheated: boolean = false;

  constructor(props: AmmoProps) {
    this.maxAmmo = props.maxAmmo;
    this.currentAmmo = this.maxAmmo;
    this.refillRate = props.refillRate;
    this.refillDelay = props.refillDelay;
    this.overheatedRefillDelay = props.overheatedRefillDelay;
  }

  canFire(): boolean {
    return this.currentAmmo > 0 && !this.isOverheated;
  }

  consumeAmmo(): void {
    if (this.currentAmmo > 0) {
      this.currentAmmo -= 1;
      this.lastFireTime = Date.now();

      if (this.currentAmmo <= 0) {
        this.currentAmmo = 0;
        this.isOverheated = true;
      }
    }
  }

  update(delta: number): void {
    const timeSinceLastFire = Date.now() - this.lastFireTime;
    const delay = this.isOverheated ? this.overheatedRefillDelay : this.refillDelay;

    // Start refilling after delay
    if (timeSinceLastFire >= delay && this.currentAmmo < this.maxAmmo) {
      const refillAmount = (this.refillRate * delta) / 1000;
      this.currentAmmo = Math.min(this.maxAmmo, this.currentAmmo + refillAmount);

      // Clear overheat flag when fully reloaded
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
