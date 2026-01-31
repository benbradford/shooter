import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import EditorScene from "./scenes/EditorScene";
import LevelSelectorScene from "./scenes/LevelSelectorScene";
import HudScene from "./scenes/HudScene";
import { TransformComponent, RemoteInputComponent, JoystickVisualsComponent, AimJoystickVisualsComponent, GridPositionComponent, ProjectileComponent } from "./ecs";

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
  scene: [GameScene, HudScene, EditorScene, LevelSelectorScene],
};

const game = new Phaser.Game(config);

const params = new URLSearchParams(window.location.search);
if (params.get('test') === 'true') {
  (window as unknown as { game: Phaser.Game; TransformComponent: typeof TransformComponent; RemoteInputComponent: typeof RemoteInputComponent; JoystickVisualsComponent: typeof JoystickVisualsComponent; AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent; GridPositionComponent: typeof GridPositionComponent; ProjectileComponent: typeof ProjectileComponent }).game = game;
  (window as unknown as { TransformComponent: typeof TransformComponent }).TransformComponent = TransformComponent;
  (window as unknown as { RemoteInputComponent: typeof RemoteInputComponent }).RemoteInputComponent = RemoteInputComponent;
  (window as unknown as { JoystickVisualsComponent: typeof JoystickVisualsComponent }).JoystickVisualsComponent = JoystickVisualsComponent;
  (window as unknown as { AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent }).AimJoystickVisualsComponent = AimJoystickVisualsComponent;
  (window as unknown as { GridPositionComponent: typeof GridPositionComponent }).GridPositionComponent = GridPositionComponent;
  (window as unknown as { ProjectileComponent: typeof ProjectileComponent }).ProjectileComponent = ProjectileComponent;
}
