import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import HudScene from "./scenes/HudScene";
import LoadingScene from "./scenes/LoadingScene";
import TitleScene from "./scenes/TitleScene";
import ProfileSelectScene from "./scenes/ProfileSelectScene";
import { TransformComponent, RemoteInputComponent, JoystickVisualsComponent, AimJoystickVisualsComponent, GridPositionComponent, ProjectileComponent } from "./ecs";
import { PetAbilityComponent } from "./ecs/components/pet/PetAbilityComponent";
import { DogBarkAbility } from "./ecs/components/pet/DogBarkAbility";
import { Pathfinder } from "./systems/Pathfinder";

// Add Eruda console for mobile debugging
if (globalThis.location.search.includes('debug')) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/eruda';
  document.body.appendChild(script);
  script.onload = () => {
    // @ts-expect-error - eruda is loaded dynamically
    eruda.init();
  };
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [TitleScene, ProfileSelectScene, GameScene, HudScene, LoadingScene],
};

const game = new Phaser.Game(config);

// If ?level= param is set, skip title screens and go straight to game
const params = new URLSearchParams(globalThis.location.search);
if (params.get('level')) {
  game.scene.start('game');
} else {
  game.scene.start('title');
}
if (params.get('test') === 'true') {
  (globalThis as unknown as { game: Phaser.Game; TransformComponent: typeof TransformComponent; RemoteInputComponent: typeof RemoteInputComponent; JoystickVisualsComponent: typeof JoystickVisualsComponent; AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent; GridPositionComponent: typeof GridPositionComponent; ProjectileComponent: typeof ProjectileComponent; PetAbilityComponent: typeof PetAbilityComponent }).game = game;
  (globalThis as unknown as { TransformComponent: typeof TransformComponent }).TransformComponent = TransformComponent;
  (globalThis as unknown as { RemoteInputComponent: typeof RemoteInputComponent }).RemoteInputComponent = RemoteInputComponent;
  (globalThis as unknown as { JoystickVisualsComponent: typeof JoystickVisualsComponent }).JoystickVisualsComponent = JoystickVisualsComponent;
  (globalThis as unknown as { AimJoystickVisualsComponent: typeof AimJoystickVisualsComponent }).AimJoystickVisualsComponent = AimJoystickVisualsComponent;
  (globalThis as unknown as { GridPositionComponent: typeof GridPositionComponent }).GridPositionComponent = GridPositionComponent;
  (globalThis as unknown as { ProjectileComponent: typeof ProjectileComponent }).ProjectileComponent = ProjectileComponent;
  (globalThis as unknown as { PetAbilityComponent: typeof PetAbilityComponent }).PetAbilityComponent = PetAbilityComponent;
  (globalThis as unknown as { DogBarkAbility: typeof DogBarkAbility }).DogBarkAbility = DogBarkAbility;
  (globalThis as unknown as { Pathfinder: typeof Pathfinder }).Pathfinder = Pathfinder;
}
