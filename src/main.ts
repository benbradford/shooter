import Phaser from "phaser";
import GameScene from "./GameScene";
import EditorScene from "./EditorScene";
import LevelSelectorScene from "./LevelSelectorScene";
import HudScene from "./HudScene";

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

new Phaser.Game(config);
