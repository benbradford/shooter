import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { HoleComponent } from '../../components/hole/HoleComponent';
import type { GridReader } from '../../../systems/grid/Grid';

export type CreateHoleEntityProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: GridReader;
  texture: string;
  entityId: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number };
  onTransition: (targetLevel: string, targetCol: number, targetRow: number) => void;
};

export function createHoleEntity(props: CreateHoleEntityProps): Entity {
  const { scene, col, row, grid, texture, entityId } = props;
  const entity = new Entity(entityId);
  entity.tags.add('hole');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const textureObj = scene.textures.get(texture);
  const frame = textureObj.get(0);
  const scale = grid.cellSize / Math.max(frame.width, frame.height);

  const t = props.transformOverride;
  const finalScaleX = scale * (t?.scaleX ?? 1);
  const finalScaleY = scale * (t?.scaleY ?? 1);

  const transform = entity.add(new TransformComponent(
    x + (t?.offsetX ?? 0),
    y + (t?.offsetY ?? 0),
    0,
    Math.max(finalScaleX, finalScaleY)
  ));
  const sprite = entity.add(new SpriteComponent(scene, texture, transform));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(Depth.shadow);
  sprite.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  if (finalScaleX !== finalScaleY) {
    sprite.sprite.setScale(finalScaleX, finalScaleY);
  }

  entity.add(new HoleComponent({
    col,
    row,
    grid,
    targetLevel: props.targetLevel,
    targetCol: props.targetCol,
    targetRow: props.targetRow,
    onTransition: props.onTransition,
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    HoleComponent,
  ]);

  return entity;
}
