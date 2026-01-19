import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { HudBarDataSource } from './HudBarComponent';

export interface HealthProps {
  maxHealth?: number;
}

export class HealthComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentHealth: number;
  private readonly maxHealth: number;

  constructor(props: HealthProps = {}) {
    this.maxHealth = props.maxHealth ?? 100;
    this.currentHealth = this.maxHealth;
  }

  getHealth(): number {
    return this.currentHealth;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getRatio(): number {
    return this.currentHealth / this.maxHealth;
  }

  takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  update(_delta: number): void {
    // No-op for now
  }

  onDestroy(): void {}
}
