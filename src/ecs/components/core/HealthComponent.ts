import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HudBarDataSource } from '../ui/HudBarComponent';

const REGEN_DELAY_MS = 3000;
const REGEN_RATE_PER_SEC = 20;

export interface HealthProps {
  maxHealth: number;
  enableRegen?: boolean;
}

export class HealthComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentHealth: number;
  private maxHealth: number;
  private timeSinceLastDamageMs: number = 0;
  private readonly enableRegen: boolean;

  constructor(props: HealthProps) {
    this.maxHealth = props.maxHealth;
    this.currentHealth = this.maxHealth;
    this.enableRegen = props.enableRegen ?? false;
  }

  getHealth(): number {
    return this.currentHealth;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  setMaxHealth(value: number): void {
    this.maxHealth = value;
    this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
  }

  getRatio(): number {
    return this.currentHealth / this.maxHealth;
  }

  takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.timeSinceLastDamageMs = 0;
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  setHealth(value: number): void {
    this.currentHealth = Math.max(0, value);
    this.maxHealth = Math.max(this.maxHealth, this.currentHealth);
  }

  update(delta: number): void {
    if (!this.enableRegen || this.currentHealth >= this.maxHealth) return;
    
    this.timeSinceLastDamageMs += delta;
    
    if (this.timeSinceLastDamageMs >= REGEN_DELAY_MS) {
      const regenAmount = REGEN_RATE_PER_SEC * (delta / 1000);
      this.heal(regenAmount);
    }
  }

  onDestroy(): void {}
}
