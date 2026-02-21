import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { HealthComponent } from './HealthComponent';

const MEDIPACK_HEAL_AMOUNT = 100;
const HEAL_RATE_PER_SEC = 50;
const OVERHEAL_DECAY_PER_SEC = 5;

export class MedipackHealerComponent implements Component {
  entity!: Entity;
  private pendingHeal = 0;

  addMedipack(): void {
    this.pendingHeal += MEDIPACK_HEAL_AMOUNT;
  }

  update(delta: number): void {
    const health = this.entity.require(HealthComponent);
    const deltaInSec = delta / 1000;

    if (this.pendingHeal > 0) {
      const healThisFrame = Math.min(this.pendingHeal, HEAL_RATE_PER_SEC * deltaInSec);
      this.pendingHeal -= healThisFrame;
      health.heal(healThisFrame);
    }

    if (this.pendingHeal === 0 && health.isOverhealed()) {
      const decay = OVERHEAL_DECAY_PER_SEC * deltaInSec;
      const currentHealth = health.getHealth();
      const maxHealth = health.getMaxHealth();
      health.setHealth(Math.max(maxHealth, currentHealth - decay));
    }
  }

  isHealing(): boolean {
    return this.pendingHeal > 0;
  }
}
