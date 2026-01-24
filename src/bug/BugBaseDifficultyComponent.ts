import type { Component } from '../ecs/Component';
import type { Entity } from '../ecs/Entity';
import type { BugBaseDifficulty } from './BugBaseDifficulty';

export class BugBaseDifficultyComponent implements Component {
  entity!: Entity;
  difficulty: BugBaseDifficulty;

  constructor(difficulty: BugBaseDifficulty) {
    this.difficulty = difficulty;
  }

  update(_delta: number): void {}

  onDestroy(): void {}
}
