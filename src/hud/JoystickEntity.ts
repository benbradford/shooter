import { Entity } from '../ecs/Entity';
import { TouchJoystickComponent } from '../ecs/components/input/TouchJoystickComponent';
import { JoystickVisualsComponent } from '../ecs/components/ui/JoystickVisualsComponent';
import { CrosshairVisualsComponent } from '../ecs/components/ui/CrosshairVisualsComponent';
import { AimJoystickComponent } from '../ecs/components/input/AimJoystickComponent';
import { AimJoystickVisualsComponent } from '../ecs/components/ui/AimJoystickVisualsComponent';
import { ControlModeComponent } from '../ecs/components/input/ControlModeComponent';

export function createJoystickEntity(scene: Phaser.Scene): Entity {
  const entity = new Entity('joystick');

  const joystick = entity.add(new TouchJoystickComponent(scene, {
    maxRadius: 150,
    innerRadius: 80,
    deadZoneDistance: 30
  }));
  joystick.init();

  const visuals = entity.add(new JoystickVisualsComponent(scene, joystick));
  visuals.init();
  
  const crosshair = entity.add(new CrosshairVisualsComponent(scene, joystick));
  crosshair.init();

  const aimJoystick = entity.add(new AimJoystickComponent(scene, {
    maxRadius: 150,
    innerRadius: 80
  }));
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
