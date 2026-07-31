import Phaser from 'phaser';
import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { MovingTileComponent } from '../../components/moving-tile/MovingTileComponent';
import type { MovingTileStep } from '../../components/moving-tile/MovingTileScript';
import type { Grid } from '../../../systems/grid/Grid';

export type CreateMovingTileProps = {
  scene: Phaser.Scene;
  grid: Grid;
  entityId: string;
  col: number;
  row: number;
  widthCells: number;
  heightCells: number;
  texture: string;
  script: MovingTileStep[];
  scriptEnabled: boolean;
};

export function createMovingTileEntity(props: CreateMovingTileProps): Entity {
  const { scene, grid, entityId, col, row, widthCells, heightCells, texture } = props;
  const entity = new Entity(entityId);
  entity.tags.add('moving_tile');

  const widthPx = widthCells * grid.cellSize;
  const heightPx = heightCells * grid.cellSize;

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + widthPx / 2;
  const y = worldPos.y + heightPx / 2;

  const frame = scene.textures.get(texture).get(0);

  const transform = entity.add(new TransformComponent(x, y, 0, 1));
  const sprite = entity.add(new SpriteComponent(scene, texture, transform, {
    scaleXOverride: widthPx / frame.width,
    scaleYOverride: heightPx / frame.height,
  }));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(Depth.movingTile);
  sprite.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  entity.add(new GridPositionComponent(col, row, {
    offsetX: 0, offsetY: 0, width: widthPx, height: heightPx
  }));

  const movingTile = entity.add(new MovingTileComponent({
    grid,
    widthCells,
    heightCells,
    startCol: col,
    startRow: row,
    script: props.script,
    scriptEnabled: props.scriptEnabled,
  }));

  entity.setUpdateOrder([
    MovingTileComponent,
    TransformComponent,
    SpriteComponent,
    GridPositionComponent,
  ]);

  movingTile.init();

  return entity;
}
