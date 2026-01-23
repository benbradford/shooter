import Phaser from "phaser";
import GameScene from "./GameScene";
import EditorScene from "./EditorScene";
import LevelSelectorScene from "./LevelSelectorScene";

// Touch controls scale - adjust this to make joysticks bigger/smaller
// 1.0 = normal, 1.5 = 50% bigger, 0.75 = 25% smaller
export const TOUCH_CONTROLS_SCALE = 0.75;

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
  scene: [GameScene, EditorScene, LevelSelectorScene],
};

new Phaser.Game(config);
