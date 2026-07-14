import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { HudBarDataSource } from '../ui/HudBarComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { WorldFlags } from '../../../constants/WorldFlags';

const REGEN_DELAY_MS = 3000;
const REGEN_RATE_PER_SEC = 20;
const REGEN_TIMER_RATE_MOVING = 0.3;
const REGEN_TIMER_RATE_STILL = 1;

export type HealthProps = {
  maxHealth: number;
  enableRegen?: boolean;
  onDeath?: () => void;
  onDamage?: () => void;
}

export class HealthComponent implements Component, HudBarDataSource {
  entity!: Entity;
  private currentHealth: number;
  private maxHealth: number;
  private timeSinceLastDamageMs: number = 0;
  private readonly enableRegen: boolean;
  private hasAutoHeal: boolean;
  private onDeath?: () => void;
  private readonly onDamage?: () => void;
  private isDead = false;
  private isInvulnerable = false;

  constructor(props: HealthProps) {
    this.maxHealth = props.maxHealth;
    this.currentHealth = this.maxHealth;
    this.enableRegen = props.enableRegen ?? false;
    this.hasAutoHeal = WorldStateManager.getInstance().isFlagTrue(WorldFlags.hasAutoHeal);
    this.onDeath = props.onDeath;
    this.onDamage = props.onDamage;
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
    return Math.min(1, this.currentHealth / this.maxHealth);
  }

  getOverhealAmount(): number {
    return Math.max(0, this.currentHealth - this.maxHealth);
  }

  isOverhealed(): boolean {
    return this.currentHealth > this.maxHealth;
  }

  takeDamage(amount: number): void {
    if (this.isInvulnerable) return;
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.timeSinceLastDamageMs = 0;
    this.onDamage?.();
    if (this.currentHealth <= 0 && !this.isDead) {
      this.isDead = true;
      this.onDeath?.();
    }
  }

  setInvulnerable(value: boolean): void {
    this.isInvulnerable = value;
  }

  isInvulnerableState(): boolean {
    return this.isInvulnerable;
  }

  heal(amount: number): void {
    const maxOverheal = this.maxHealth * 2;
    this.currentHealth = Math.min(maxOverheal, this.currentHealth + amount);
  }

  setHealth(value: number): void {
    this.currentHealth = Math.max(0, value);
  }

  getHasAutoHeal(): boolean {
    return this.hasAutoHeal;
  }

  refreshAutoHeal(): void {
    this.hasAutoHeal = WorldStateManager.getInstance().isFlagTrue(WorldFlags.hasAutoHeal);
  }

  setOnDeath(callback: () => void): void {
    this.onDeath = callback;
  }

  update(delta: number): void {
    if (!this.enableRegen || this.currentHealth >= this.maxHealth) return;
    if (!this.hasAutoHeal) return;

    if (this.currentHealth > 150) return;

    // Regen timer accumulates slower while moving, faster while still
    const walk = this.entity.get(WalkComponent);
    const timerRate = walk?.isMoving() ? REGEN_TIMER_RATE_MOVING : REGEN_TIMER_RATE_STILL;
    this.timeSinceLastDamageMs += delta * timerRate;

    if (this.timeSinceLastDamageMs >= REGEN_DELAY_MS) {
      const regenAmount = REGEN_RATE_PER_SEC * (delta / 1000);
      this.heal(regenAmount);
    }
  }

}
