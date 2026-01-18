import { Entity } from '../ecs/Entity';
import { TouchJoystickComponent } from '../ecs/components/TouchJoystickComponent';
import { JoystickVisualsComponent } from '../ecs/components/JoystickVisualsComponent';

export function createJoystickEntity(scene: Phaser.Scene): Entity {
  const entity = new Entity('joystick');

  const joystick = entity.add(new TouchJoystickComponent(scene));
  joystick.init();

  const visuals = entity.add(new JoystickVisualsComponent(scene, joystick));
  visuals.init();

  entity.setUpdateOrder([
    TouchJoystickComponent,
    JoystickVisualsComponent,
  ]);

  return entity;
}
