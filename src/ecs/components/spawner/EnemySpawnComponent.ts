import type { Component } from '../../Component';
import { BaseEventComponent } from '../core/BaseEventComponent';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';

export type EnemySpawnComponentProps = {
  eventManager: EventManagerSystem;
  eventName: string;
  enemyIds: string[];
  spawnDelayMs: number;
  onSpawnEnemy: (enemyId: string) => void;
};

export class EnemySpawnComponent extends BaseEventComponent implements Component {
  private readonly enemyIds: string[];
  private readonly spawnDelayMs: number;
  private readonly onSpawnEnemy: (enemyId: string) => void;
  private currentIndex: number = 0;
  private timeSinceLastSpawnMs: number = 0;
  private isSpawning: boolean = false;

  constructor(props: EnemySpawnComponentProps) {
    super(props.eventManager);
    this.enemyIds = props.enemyIds;
    this.spawnDelayMs = props.spawnDelayMs;
    this.onSpawnEnemy = props.onSpawnEnemy;
    this.registerEvent(props.eventName);
  }

  onEvent(_eventName: string): void {
    if (!this.isSpawning && this.currentIndex < this.enemyIds.length) {
      this.isSpawning = true;
      this.spawnNext();
    }
  }

  update(delta: number): void {
    if (!this.isSpawning || this.currentIndex >= this.enemyIds.length) {
      if (this.currentIndex >= this.enemyIds.length) {
        this.entity.destroy();
      }
      return;
    }

    this.timeSinceLastSpawnMs += delta;
    if (this.timeSinceLastSpawnMs >= this.spawnDelayMs) {
      this.spawnNext();
    }
  }

  private spawnNext(): void {
    if (this.currentIndex >= this.enemyIds.length) {
      return;
    }

    const enemyId = this.enemyIds[this.currentIndex];
    this.onSpawnEnemy(enemyId);
    this.currentIndex++;
    this.timeSinceLastSpawnMs = 0;
  }

  onDestroy(): void {
    super.onDestroy();
  }
}
