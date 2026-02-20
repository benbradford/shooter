import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { HealthComponent } from './HealthComponent';

const MEDIPACK_HEAL_AMOUNT = 100;
const HEAL_RATE_PER_SEC = 50;
const OVERHEAL_MAX = 200;
const OVERHEAL_DECAY_PER_SEC = 5;

export class MedipackHealerComponent implements Component {
  entity!: Entity;
  private pendingHeal = 0;
  private overhealAmount = 0;

  addMedipack(): void {
    this.pendingHeal += MEDIPACK_HEAL_AMOUNT;
  }

  update(delta: number): void {
    const health = this.entity.require(HealthComponent);
    const deltaInSec = delta / 1000;

    if (this.pendingHeal > 0) {
      const healThisFrame = Math.min(this.pendingHeal, HEAL_RATE_PER_SEC * deltaInSec);
      this.pendingHeal -= healThisFrame;

      const currentHealth = health.getHealth();
      const maxHealth = health.getMaxHealth();
      const newHealth = currentHealth + healThisFrame;

      if (newHealth <= maxHealth) {
        health.setHealth(newHealth);
      } else {
        health.setHealth(maxHealth);
        const overflow = newHealth - maxHealth;
        this.overhealAmount = Math.min(OVERHEAL_MAX - maxHealth, this.overhealAmount + overflow);
      }
    }

    if (this.pendingHeal === 0 && this.overhealAmount > 0) {
      const decay = OVERHEAL_DECAY_PER_SEC * deltaInSec;
      this.overhealAmount = Math.max(0, this.overhealAmount - decay);
    }
  }

  getTotalHealth(): number {
    const health = this.entity.require(HealthComponent);
    return health.getHealth() + this.overhealAmount;
  }

  getOverhealAmount(): number {
    return this.overhealAmount;
  }

  removeOverheal(amount: number): void {
    this.overhealAmount = Math.max(0, this.overhealAmount - amount);
  }

  isHealing(): boolean {
    return this.pendingHeal > 0;
  }
}
