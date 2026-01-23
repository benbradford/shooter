import Phaser from "phaser";
import type GameScene from "./GameScene";
import type { Grid } from "./utils/Grid";
import type { LevelData } from "./level/LevelLoader";
import type { Entity } from "./ecs/Entity";
import { StateMachine } from "./utils/state/StateMachine";
import { DefaultEditorState } from "./editor/DefaultEditorState";
import { GridEditorState } from "./editor/GridEditorState";
import { ResizeEditorState } from "./editor/ResizeEditorState";
import { MoveEditorState, type MoveEditorStateProps } from "./editor/MoveEditorState";
import { EditRobotEditorState } from "./editor/EditRobotEditorState";
import { AddEditorState } from "./editor/AddEditorState";
import { AddRobotEditorState } from "./editor/AddRobotEditorState";
import { TextureEditorState } from "./editor/TextureEditorState";
import { PatrolComponent } from "./ecs/components/PatrolComponent";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import { HealthComponent } from "./ecs/components/HealthComponent";
import { FireballPropertiesComponent } from "./ecs/components/FireballPropertiesComponent";
import { TransformComponent } from "./ecs/components/TransformComponent";

export default class EditorScene extends Phaser.Scene {
  private stateMachine!: StateMachine<void | Entity | MoveEditorStateProps>;
  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private originalLevelData!: string;
  private readonly cameraSpeed = 400;

  constructor() {
    super({ key: 'EditorScene' });
  }

  create() {
    // Store original level data for change detection
    this.originalLevelData = JSON.stringify(this.getCurrentLevelData());

    // Get GameScene camera and stop following player
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    
    // Stop following player
    camera.stopFollow();
    
    // Store original bounds
    const grid = this.getGrid();
    const originalBounds = {
      x: 0,
      y: 0,
      width: grid.width * grid.cellSize,
      height: grid.height * grid.cellSize
    };
    
    // Remove bounds for editor (set to very large area)
    camera.setBounds(-10000, -10000, 20000, 20000);
    
    // Store for restoration
    this.registry.set('editorOriginalBounds', originalBounds);

    // Semi-transparent overlay
    this.overlay = this.add.rectangle(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.3
    );
    this.overlay.setOrigin(0, 0);
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(900);

    // Title
    const centerX = this.cameras.main.width / 2;
    this.title = this.add.text(centerX, 30, 'LEVEL EDITOR', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.title.setOrigin(0.5);
    this.title.setScrollFactor(0);
    this.title.setDepth(1000);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // ESC to exit
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.exitEditor();
    });

    // Initialize state machine
    this.stateMachine = new StateMachine<void | Entity | MoveEditorStateProps>({
      default: new DefaultEditorState(this),
      grid: new GridEditorState(this),
      resize: new ResizeEditorState(this),
      move: new MoveEditorState(this),
      editRobot: new EditRobotEditorState(this),
      add: new AddEditorState(this),
      addRobot: new AddRobotEditorState(this),
      texture: new TextureEditorState(this)
    }, 'default');

    // Event listeners
    this.events.on('changeEditorState', (stateName: string) => {
      this.stateMachine.enter(stateName);
    });

  }

  update(_time: number, delta: number): void {
    this.stateMachine.update(delta);
    this.handleCameraMovement(delta);
    
    // Render cell coordinates in editor
    const grid = this.getGrid();
    grid.renderCellCoordinates();
  }

  private handleCameraMovement(delta: number): void {
    const speed = this.cameraSpeed * (delta / 1000);
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      camera.scrollX -= speed;
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      camera.scrollX += speed;
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      camera.scrollY -= speed;
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      camera.scrollY += speed;
    }
  }

  getGrid(): Grid {
    const gameScene = this.scene.get('game') as GameScene;
    return gameScene.getGrid();
  }

  setCellData(col: number, row: number, data: { layer?: number; isTransition?: boolean; backgroundTexture?: string }): void {
    const grid = this.getGrid();
    grid.setCell(col, row, data);
    grid.render(); // Force re-render to show changes
  }

  hasUnsavedChanges(): boolean {
    const current = JSON.stringify(this.getCurrentLevelData());
    return current !== this.originalLevelData;
  }

  private getCurrentLevelData(): LevelData {
    const grid = this.getGrid();
    const gameScene = this.scene.get('game') as GameScene;
    const cells = [];

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && (cell.layer !== 0 || cell.isTransition || cell.backgroundTexture)) {
          cells.push({
            col,
            row,
            layer: cell.layer === 0 ? undefined : cell.layer,
            isTransition: cell.isTransition ? cell.isTransition : undefined,
            backgroundTexture: cell.backgroundTexture
          });
        }
      }
    }

    // Get robot data from entities
    const robots: Array<{
      col: number;
      row: number;
      health: number;
      speed: number;
      waypoints: Array<{ col: number; row: number }>;
      fireballSpeed: number;
      fireballDuration: number;
    }> = [];

    const entityManager = gameScene.getEntityManager();
    const entities = entityManager.getAll();
    for (const entity of entities) {
      const patrol = entity.get(PatrolComponent);
      if (patrol) {
        const sprite = entity.get(SpriteComponent);
        const health = entity.get(HealthComponent);
        const fireballProps = entity.get(FireballPropertiesComponent);
        if (sprite && health && fireballProps) {
          const cell = grid.worldToCell(sprite.sprite.x, sprite.sprite.y);
          robots.push({
            col: cell.col,
            row: cell.row,
            health: health.getHealth(),
            speed: patrol.speed,
            waypoints: [...patrol.waypoints],
            fireballSpeed: fireballProps.speed,
            fireballDuration: fireballProps.duration
          });
        }
      }
    }

    const player = entityManager.getFirst('player');
    const playerTransform = player?.get(TransformComponent);
    const playerStart = playerTransform 
      ? {
          x: Math.round(playerTransform.x / grid.cellSize),
          y: Math.round(playerTransform.y / grid.cellSize)
        }
      : { x: 10, y: 10 };

    return {
      width: grid.width,
      height: grid.height,
      playerStart,
      cells,
      robots: robots.length > 0 ? robots : undefined
    };
  }

  saveLevel(): void {
    const levelData = this.getCurrentLevelData();
    const json = JSON.stringify(levelData, null, 2);
    
    // Log to console for easy copy/paste
    console.log('Level JSON (copy and paste into public/levels/default.json):');
    console.log(json);
    
    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'default.json';
    a.click();
    URL.revokeObjectURL(url);

    // Update original data
    this.originalLevelData = JSON.stringify(levelData);
    
    // Log instructions
    console.log('✓ Level saved to ~/Downloads/default.json');
    console.log('To update the game, run: ./scripts/update-levels.sh');
  }

  logLevel(): void {
    const levelData = this.getCurrentLevelData();
    const json = JSON.stringify(levelData, null, 2);
    console.log('=== LEVEL JSON ===');
    console.log(json);
    console.log('=== END LEVEL JSON ===');
    
    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
      console.log('✓ Level JSON copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }

  enterDefaultMode(): void {
    this.stateMachine.enter('default');
  }

  enterGridMode(): void {
    this.stateMachine.enter('grid');
  }

  enterResizeMode(): void {
    this.stateMachine.enter('resize');
  }

  enterMoveMode(entity?: Entity, returnState?: string): void {
    // Default to player if no entity provided
    if (!entity) {
      const gameScene = this.scene.get('game') as GameScene;
      const entityManager = gameScene.getEntityManager();
      entity = entityManager.getFirst('player') || undefined;
    }
    
    if (!entity) {
      throw new Error('No entity available to move');
    }
    
    this.stateMachine.enter('move', { entity, returnState });
  }

  enterEditRobotMode(robot?: Entity): void {
    this.stateMachine.enter('editRobot', robot);
  }

  enterAddMode(): void {
    this.stateMachine.enter('add');
  }

  enterAddRobotMode(): void {
    this.stateMachine.enter('addRobot');
  }

  enterTextureMode(): void {
    this.stateMachine.enter('texture');
  }

  removeRow(row: number): void {
    const grid = this.getGrid();
    if (row < 0 || row >= grid.height || grid.height <= 10) return;
    
    // Shift all rows after this one up
    for (let r = row; r < grid.height - 1; r++) {
      for (let c = 0; c < grid.width; c++) {
        const nextCell = grid.getCell(c, r + 1);
        if (nextCell) {
          grid.setCell(c, r, {
            layer: nextCell.layer,
            isTransition: nextCell.isTransition
          });
        }
      }
    }
    
    // Remove last row by resizing
    grid.removeRow();
    grid.render();
  }

  removeColumn(col: number): void {
    const grid = this.getGrid();
    if (col < 0 || col >= grid.width || grid.width <= 10) return;
    
    // Shift all columns after this one left
    for (let c = col; c < grid.width - 1; c++) {
      for (let r = 0; r < grid.height; r++) {
        const nextCell = grid.getCell(c + 1, r);
        if (nextCell) {
          grid.setCell(c, r, {
            layer: nextCell.layer,
            isTransition: nextCell.isTransition
          });
        }
      }
    }
    
    // Remove last column by resizing
    grid.removeColumn();
    grid.render();
  }

  addRow(): void {
    const grid = this.getGrid();
    grid.addRow();
    grid.render();
  }

  addColumn(): void {
    const grid = this.getGrid();
    grid.addColumn();
    grid.render();
  }

  exitEditor(): void {
    // Restore camera bounds and following
    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const bounds = this.registry.get('editorOriginalBounds') as { x: number; y: number; width: number; height: number };
    
    if (bounds) {
      camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    
    // Resume following player
    const entityManager = gameScene.getEntityManager();
    const player = entityManager.getFirst('player');
    if (player) {
      const sprite = player.get(SpriteComponent);
      if (sprite) {
        camera.startFollow(sprite.sprite, true, 0.1, 0.1);
      }
    }
    
    this.scene.resume('game');
    this.scene.stop();
  }
}
