import Phaser from "phaser";
import GameScene from "./GameScene";
import EditorScene from "./EditorScene";
import LevelSelectorScene from "./LevelSelectorScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 64 * 20,   // 1280 px
  height: 64 * 14,  // 896 px
  backgroundColor: "rgba(65, 82, 85, 0)",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, EditorScene, LevelSelectorScene],
};

new Phaser.Game(config);
