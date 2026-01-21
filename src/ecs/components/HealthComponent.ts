import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { HudBarDataSource } from './HudBarComponent';

export interface HealthProps {
  maxHealth: number;
}

export class HealthComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentHealth: number;
  private maxHealth: number;

  constructor(props: HealthProps) {
    this.maxHealth = props.maxHealth;
    this.currentHealth = this.maxHealth;
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
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  setHealth(value: number): void {
    this.currentHealth = Math.max(0, value);
    this.maxHealth = Math.max(this.maxHealth, this.currentHealth);
  }

  update(_delta: number): void {
    // No-op for now
  }

  onDestroy(): void {}
}
