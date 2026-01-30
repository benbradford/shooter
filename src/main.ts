import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import EditorScene from "./scenes/EditorScene";
import LevelSelectorScene from "./scenes/LevelSelectorScene";
import HudScene from "./scenes/HudScene";
import { TransformComponent } from "./ecs";

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
  (window as unknown as { game: Phaser.Game; TransformComponent: typeof TransformComponent }).game = game;
  (window as unknown as { TransformComponent: typeof TransformComponent }).TransformComponent = TransformComponent;
}
