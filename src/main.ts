import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import LevelSelectorScene from "./scenes/LevelSelectorScene";
import HudScene from "./scenes/HudScene";
import EditorScene from "./scenes/EditorScene";
import { TransformComponent, RemoteInputComponent, JoystickVisualsComponent, AimJoystickVisualsComponent, GridPositionComponent, ProjectileComponent, AmmoComponent, OverheatSmokeComponent } from "./ecs";
import { PLAYER_MAX_AMMO, PLAYER_FIRE_COOLDOWN_MS } from "./ecs/entities/player/PlayerEntity";
import { INITIAL_AIM_WAIT_TIME_MS } from "./ecs/components/combat/ProjectileEmitterComponent";
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

const params = new URLSearchParams(window.location.search);
if (params.get('test') === 'true') {
  (window as unknown as { game: Phaser.Game; TransformComponent: typeof TransformComponent; RemoteInputComponent: typeof RemoteInputComponent; JoystickVisualsComponent: typeof JoystickVisualsComponent; AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent; GridPositionComponent: typeof GridPositionComponent; ProjectileComponent: typeof ProjectileComponent }).game = game;
  (window as unknown as { TransformComponent: typeof TransformComponent }).TransformComponent = TransformComponent;
  (window as unknown as { RemoteInputComponent: typeof RemoteInputComponent }).RemoteInputComponent = RemoteInputComponent;
  (window as unknown as { JoystickVisualsComponent: typeof JoystickVisualsComponent }).JoystickVisualsComponent = JoystickVisualsComponent;
  (window as unknown as { AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent }).AimJoystickVisualsComponent = AimJoystickVisualsComponent;
  (window as unknown as { GridPositionComponent: typeof GridPositionComponent }).GridPositionComponent = GridPositionComponent;
  (window as unknown as { ProjectileComponent: typeof ProjectileComponent }).ProjectileComponent = ProjectileComponent;
  (window as unknown as { AmmoComponent: typeof AmmoComponent }).AmmoComponent = AmmoComponent;
  (window as unknown as { OverheatSmokeComponent: typeof OverheatSmokeComponent }).OverheatSmokeComponent = OverheatSmokeComponent;
  (window as unknown as { Pathfinder: typeof Pathfinder }).Pathfinder = Pathfinder;
  (window as unknown as { PLAYER_MAX_AMMO: number }).PLAYER_MAX_AMMO = PLAYER_MAX_AMMO;
  (window as unknown as { INITIAL_AIM_WAIT_TIME_MS: number }).INITIAL_AIM_WAIT_TIME_MS = INITIAL_AIM_WAIT_TIME_MS;
  (window as unknown as { PLAYER_FIRE_COOLDOWN_MS: number }).PLAYER_FIRE_COOLDOWN_MS = PLAYER_FIRE_COOLDOWN_MS;
}
