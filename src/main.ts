import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import HudScene from "./scenes/HudScene";
import LoadingScene from "./scenes/LoadingScene";
import BootScene from "./scenes/BootScene";
import TitleScene from "./scenes/TitleScene";
import ProfileSelectScene from "./scenes/ProfileSelectScene";
import { TransformComponent, RemoteInputComponent, JoystickVisualsComponent, AimJoystickVisualsComponent, GridPositionComponent, ProjectileComponent, AttackButtonComponent, WalkComponent, StateMachineComponent, HealthComponent, WaterEffectComponent, PushableComponent, MovingTileComponent, AnimationComponent, LevelExitComponent } from "./ecs";
import { AttackComboComponent } from "./ecs/components/combat/AttackComboComponent";
import { PetAbilityComponent } from "./ecs/components/pet/PetAbilityComponent";
import { DogBarkAbility } from "./ecs/components/pet/DogBarkAbility";
import { Pathfinder } from "./systems/Pathfinder";
import { WorldStateManager } from "./systems/WorldStateManager";
import { CachedFlag } from "./systems/state/CachedFlag";
import { JumpComponent } from "./ecs/components/movement/JumpComponent";
import { PetFollowComponent } from "./ecs/components/pet/PetFollowComponent";
import { PetManager } from "./systems/PetManager";
import { FlyBehaviorComponent } from "./ecs/components/fly/FlyBehaviorComponent";
import { BreakableComponent } from "./ecs/components/breakable/BreakableComponent";
import { CoinComponent } from "./ecs/components/pickup/CoinComponent";
import { SpriteComponent } from "./ecs/components/core/SpriteComponent";
import { RootChestComponent } from "./ecs/entities/root_chest/RootChestComponent";

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

const params = new URLSearchParams(globalThis.location.search);
const startWithGame = !!params.get('level');

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
  scene: startWithGame
    ? [GameScene, HudScene, LoadingScene, BootScene, TitleScene, ProfileSelectScene]
    : [BootScene, TitleScene, ProfileSelectScene, GameScene, HudScene, LoadingScene],
};

const game = new Phaser.Game(config);
if (params.get('test') === 'true') {
  const g = globalThis as Record<string, unknown>;
  g.game = game;
  g.TransformComponent = TransformComponent;
  g.RemoteInputComponent = RemoteInputComponent;
  g.JoystickVisualsComponent = JoystickVisualsComponent;
  g.AimJoystickVisualsComponent = AimJoystickVisualsComponent;
  g.GridPositionComponent = GridPositionComponent;
  g.ProjectileComponent = ProjectileComponent;
  g.PetAbilityComponent = PetAbilityComponent;
  g.DogBarkAbility = DogBarkAbility;
  g.Pathfinder = Pathfinder;
  g.AttackButtonComponent = AttackButtonComponent;
  g.WorldStateManager = WorldStateManager;
  g.AttackComboComponent = AttackComboComponent;
  g.HealthComponent = HealthComponent;
  g.WalkComponent = WalkComponent;
  g.StateMachineComponent = StateMachineComponent;
  g.WaterEffectComponent = WaterEffectComponent;
  g.CachedFlag = CachedFlag;
  g.PushableComponent = PushableComponent;
  g.MovingTileComponent = MovingTileComponent;
  g.JumpComponent = JumpComponent;
  g.AnimationComponent = AnimationComponent;
  g.PetFollowComponent = PetFollowComponent;
  g.PetManager = PetManager;
  g.LevelExitComponent = LevelExitComponent;
  g.FlyBehaviorComponent = FlyBehaviorComponent;
  g.BreakableComponent = BreakableComponent;
  g.CoinComponent = CoinComponent;
  g.SpriteComponent = SpriteComponent;
  g.RootChestComponent = RootChestComponent;
}
