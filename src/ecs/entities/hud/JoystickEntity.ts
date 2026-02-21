import { Entity } from '../../Entity';
import { TouchJoystickComponent } from '../../components/input/TouchJoystickComponent';
import { JoystickVisualsComponent } from '../../components/ui/JoystickVisualsComponent';
import { AttackButtonComponent } from '../../components/input/AttackButtonComponent';
import { ControlModeComponent } from '../../components/input/ControlModeComponent';
import { CoinCounterComponent } from '../../components/ui/CoinCounterComponent';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';

export function createJoystickEntity(scene: Phaser.Scene, eventManager: EventManagerSystem): Entity {
  const entity = new Entity('joystick');

  const joystick = entity.add(new TouchJoystickComponent(scene, {
    maxRadius: 150,
    innerRadius: 80,
    deadZoneDistance: 30
  }));
  joystick.init();

  const visuals = entity.add(new JoystickVisualsComponent(scene, joystick));
  visuals.init();
  
  const attackButton = entity.add(new AttackButtonComponent(scene));
  attackButton.init();

  const controlMode = entity.add(new ControlModeComponent(scene));
  controlMode.init();
  
  const coinCounter = entity.add(new CoinCounterComponent(scene, eventManager));
  coinCounter.init();

  entity.setUpdateOrder([
    TouchJoystickComponent,
    JoystickVisualsComponent,
    AttackButtonComponent,
    ControlModeComponent,
    CoinCounterComponent,
  ]);

  return entity;
}
