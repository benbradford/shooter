import type Phaser from 'phaser';
import type { LevelTheme } from '../../systems/level/LevelLoader';
import type { GameSceneRenderer } from './GameSceneRenderer';
import type { WildsMistConfig } from './WildsSceneRenderer';
import { DungeonSceneRenderer } from './DungeonSceneRenderer';
import { SwampSceneRenderer } from './SwampSceneRenderer';
import { GrassSceneRenderer } from './GrassSceneRenderer';
import { WildsSceneRenderer } from './WildsSceneRenderer';
import { TunnelsSceneRenderer } from './TunnelsSceneRenderer';
import { DefaultSceneRenderer } from './DefaultSceneRenderer';

export function createThemeRenderer(scene: Phaser.Scene, cellSize: number, theme: LevelTheme, mistConfig?: WildsMistConfig): GameSceneRenderer {
  switch (theme) {
    case 'dungeon': return new DungeonSceneRenderer(scene, cellSize);
    case 'swamp': return new SwampSceneRenderer(scene, cellSize);
    case 'grass': return new GrassSceneRenderer(scene, cellSize);
    case 'wilds': return new WildsSceneRenderer(scene, cellSize, mistConfig);
    case 'tunnels': return new TunnelsSceneRenderer(scene, cellSize);
    default: return new DefaultSceneRenderer(scene, cellSize);
  }
}
