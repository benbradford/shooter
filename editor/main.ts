import Phaser from 'phaser';
import GameScene from '../src/scenes/GameScene';
import { EditorBridge } from './EditorBridge';
import { PanelController } from './panels/PanelController';
import { CanvasInteraction } from './CanvasInteraction';

const DEFAULT_LEVEL = 'grass_overworld1';

// Get level from URL params
const params = new URLSearchParams(globalThis.location.search);
const startLevel = params.get('level') ?? DEFAULT_LEVEL;

const bridge = EditorBridge.getInstance();
bridge.currentLevelName = startLevel;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  parent: 'canvas-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  loader: {
    baseURL: '/',
  },
  // No scene here — we add it manually after ready so we can pass editorMode data
  scene: [],
});

game.events.once('ready', () => {
  const panelController = new PanelController(bridge);
  const canvasContainer = document.getElementById('canvas-container')!;
  const canvasInteraction = new CanvasInteraction(bridge, canvasContainer);

  bridge.onSceneReady = () => {
    canvasInteraction.registerPhaserListeners();
  };

  bridge.onLoadError = (levelName, error) => {
    panelController.toast.show(`Failed to load ${levelName}: ${error}`, 'error');
  };

  // Add scene then start it with editor data
  game.scene.add('game', GameScene);
  game.scene.start('game', { editorMode: true, levelName: startLevel });

  window.addEventListener('beforeunload', (e) => {
    if (bridge.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
