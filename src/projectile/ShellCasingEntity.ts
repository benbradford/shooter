import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { ShellCasingComponent } from '../ecs/components/ShellCasingComponent';
import { Direction } from '../constants/Direction';

export function createShellCasingEntity(
  scene: Phaser.Scene,
  playerX: number,
  playerY: number,
  direction: 'left' | 'right',
  playerDirection: Direction
): Entity {
  const entity = new Entity('shell_casing');

  const transform = entity.add(new TransformComponent(playerX, playerY, 0, 0.5));  // Scale 0.5 = half size
  const sprite = entity.add(new SpriteComponent(scene, 'bullet_default_shell', transform));
  
  // Set depth based on player facing direction
  const facingUp = [Direction.Up, Direction.UpLeft, Direction.UpRight].includes(playerDirection);
  sprite.sprite.setDepth(facingUp ? -1 : 1);

  const floorY = playerY + 40;
  const shellCasing = entity.add(new ShellCasingComponent(direction, floorY, sprite));

  entity.setUpdateOrder([
    shellCasing,
    transform,
    sprite,
  ]);

  return entity;
}
