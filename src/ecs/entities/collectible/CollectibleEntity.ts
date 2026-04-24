import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollectibleComponent } from '../../components/pickup/CollectibleComponent';
import { CollectibleVisualComponent } from '../../components/visual/CollectibleVisualComponent';
import { PulsingScaleComponent } from '../../components/visual/PulsingScaleComponent';
import { Depth } from '../../../constants/DepthConstants';
import type { GridReader } from '../../../systems/grid/Grid';

const SPRITE_SIZE_RATIO = 0.3;
const PULSE_AMPLITUDE = 0.08;
const PULSE_FREQUENCY_HZ = 1.2;

type CollectiblePreset = 'mist_orb';

const PRESETS: Record<CollectiblePreset, { texture: string; flagName: string; tint: number }> = {
  mist_orb: { texture: 'mist_orb', flagName: 'mist_orb', tint: 0x66ddff },
};

export type CreateCollectibleProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: GridReader;
  entityId: string;
  preset: CollectiblePreset;
  playerEntity: Entity;
};

export function createCollectibleEntity(props: CreateCollectibleProps): Entity {
  const { scene, col, row, grid, entityId, preset, playerEntity } = props;
  const config = PRESETS[preset];
  const entity = new Entity(entityId);
  entity.tags.add('collectible');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const targetSize = grid.cellSize * SPRITE_SIZE_RATIO;
  const textureObj = scene.textures.get(config.texture);
  const frame = textureObj.get(0);
  const maxDim = Math.max(frame.width, frame.height);
  const baseScale = targetSize / maxDim;

  const transform = entity.add(new TransformComponent(x, y, 0, baseScale));
  const sprite = entity.add(new SpriteComponent(scene, config.texture, transform));
  sprite.sprite.setDepth(Depth.pickup);
  sprite.sprite.setBlendMode(Phaser.BlendModes.ADD);

  entity.add(new CollectibleVisualComponent({
    scene, texture: config.texture, tint: config.tint,
    baseScale, x, y, depth: Depth.pickup,
  }));

  entity.add(new PulsingScaleComponent({
    baseScale,
    amplitude: PULSE_AMPLITUDE,
    frequency: PULSE_FREQUENCY_HZ,
  }));

  entity.add(new CollectibleComponent({
    playerEntity,
    flagName: config.flagName,
  }));

  entity.setUpdateOrder([
    PulsingScaleComponent,
    CollectibleVisualComponent,
    TransformComponent,
    SpriteComponent,
    CollectibleComponent,
  ]);

  return entity;
}
