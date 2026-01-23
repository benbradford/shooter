import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { RobotDifficulty } from '../../robot/RobotDifficulty';

export class RobotDifficultyComponent implements Component {
  entity!: Entity;

  constructor(public difficulty: RobotDifficulty) {}

  init(): void {
    // data only
  }
  update(_delta: number): void {
    // data only
  }
  onDestroy(): void {}
}
