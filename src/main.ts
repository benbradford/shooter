import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import LevelSelectorScene from "./scenes/LevelSelectorScene";
import HudScene from "./scenes/HudScene";
import EditorScene from "./scenes/EditorScene";
import { TransformComponent, RemoteInputComponent, JoystickVisualsComponent, AimJoystickVisualsComponent, GridPositionComponent, ProjectileComponent } from "./ecs";
import { Pathfinder } from "./systems/Pathfinder";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1100,
  height: 500,
  backgroundColor: "rgba(65, 82, 85, 0)",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [GameScene, HudScene, LevelSelectorScene, EditorScene],
};

const game = new Phaser.Game(config);

const params = new URLSearchParams(globalThis.location.search);
if (params.get('test') === 'true') {
  (globalThis as unknown as { game: Phaser.Game; TransformComponent: typeof TransformComponent; RemoteInputComponent: typeof RemoteInputComponent; JoystickVisualsComponent: typeof JoystickVisualsComponent; AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent; GridPositionComponent: typeof GridPositionComponent; ProjectileComponent: typeof ProjectileComponent }).game = game;
  (globalThis as unknown as { TransformComponent: typeof TransformComponent }).TransformComponent = TransformComponent;
  (globalThis as unknown as { RemoteInputComponent: typeof RemoteInputComponent }).RemoteInputComponent = RemoteInputComponent;
  (globalThis as unknown as { JoystickVisualsComponent: typeof JoystickVisualsComponent }).JoystickVisualsComponent = JoystickVisualsComponent;
  (globalThis as unknown as { AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent }).AimJoystickVisualsComponent = AimJoystickVisualsComponent;
  (globalThis as unknown as { GridPositionComponent: typeof GridPositionComponent }).GridPositionComponent = GridPositionComponent;
  (globalThis as unknown as { ProjectileComponent: typeof ProjectileComponent }).ProjectileComponent = ProjectileComponent;
  (globalThis as unknown as { Pathfinder: typeof Pathfinder }).Pathfinder = Pathfinder;
}
