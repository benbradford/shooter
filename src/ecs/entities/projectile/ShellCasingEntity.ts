import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { ShellCasingComponent } from '../../components/visual/ShellCasingComponent';
import { Direction } from '../../../constants/Direction';
import { SHELL_SCALE } from './ProjectileConfig';

export function createShellCasingEntity(
  scene: Phaser.Scene,
  characterX: number,
  characterY: number,
  direction: 'left' | 'right',
  playerDirection: Direction
): Entity {
  const entity = new Entity('shell_casing');

  const transform = entity.add(new TransformComponent(characterX, characterY, 0, SHELL_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default_shell', transform));

  // Set depth based on player facing direction
  const facingUp = [Direction.Up, Direction.UpLeft, Direction.UpRight].includes(playerDirection);
  sprite.sprite.setDepth(facingUp ? -1 : 1);

  const floorY = characterY + 40;
  entity.add(new ShellCasingComponent(direction, floorY, sprite));

  entity.setUpdateOrder([
    ShellCasingComponent,
    TransformComponent,
    SpriteComponent,
  ]);

  return entity;
}
