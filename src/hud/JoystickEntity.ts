import { Entity } from '../ecs/Entity';
import { TouchJoystickComponent } from '../ecs/components/TouchJoystickComponent';
import { JoystickVisualsComponent } from '../ecs/components/JoystickVisualsComponent';
import { CrosshairVisualsComponent } from '../ecs/components/CrosshairVisualsComponent';
import { AimJoystickComponent } from '../ecs/components/AimJoystickComponent';
import { AimJoystickVisualsComponent } from '../ecs/components/AimJoystickVisualsComponent';
import { ControlModeComponent } from '../ecs/components/ControlModeComponent';

export function createJoystickEntity(scene: Phaser.Scene): Entity {
  const entity = new Entity('joystick');

  const joystick = entity.add(new TouchJoystickComponent(scene));
  joystick.init();

  const visuals = entity.add(new JoystickVisualsComponent(scene, joystick));
  visuals.init();
  
  const crosshair = entity.add(new CrosshairVisualsComponent(scene, joystick));
  crosshair.init();

  const aimJoystick = entity.add(new AimJoystickComponent(scene));
  aimJoystick.init();

  const aimVisuals = entity.add(new AimJoystickVisualsComponent(scene, aimJoystick));
  aimVisuals.init();

  const controlMode = entity.add(new ControlModeComponent(scene));
  controlMode.init();

  entity.setUpdateOrder([
    TouchJoystickComponent,
    JoystickVisualsComponent,
    CrosshairVisualsComponent,
    AimJoystickComponent,
    AimJoystickVisualsComponent,
    ControlModeComponent,
  ]);

  return entity;
}
