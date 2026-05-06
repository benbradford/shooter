import type Phaser from 'phaser';
import type { Entity } from '../../../Entity';
import type { GridReader } from '../../../../systems/grid/Grid';
import type { ThrowArrowIndicator } from '../ThrowArrowIndicator';
import { Direction } from '../../../../constants/Direction';

export type ThrowState = 'idle' | 'charging' | 'aiming' | 'throwing' | 'landed' | 'returning';

export type RockThrowContext = {
  readonly scene: Phaser.Scene;
  readonly grid: GridReader;
  readonly playerEntity: Entity;
  readonly entity: Entity;
  readonly arrowIndicator: ThrowArrowIndicator;
  throwDirX: number;
  throwDirY: number;
  throwDir: Direction;
  lastKnownHealth: number;
  setState: (state: ThrowState) => void;
};

export type RockThrowStateHandler = {
  enter?(): void;
  update(delta: number): void;
  exit?(): void;
};
