import Phaser from "phaser";
import type GameScene from "./GameScene";
import type HudScene from "./HudScene";
import type { Grid, CellProperty } from "../systems/grid/Grid";
import type { LevelData, LevelBugBase } from "../systems/level/LevelLoader";
import type { Entity } from "../ecs/Entity";
import type { EnemyDifficulty } from "../constants/EnemyDifficulty";
import { StateMachine } from "../systems/state/StateMachine";
import { DefaultEditorState } from "../editor/DefaultEditorState";
import { GridEditorState } from "../editor/GridEditorState";
import { ResizeEditorState } from "../editor/ResizeEditorState";
import { MoveEditorState, type MoveEditorStateProps } from "../editor/MoveEditorState";
import { EditRobotEditorState } from "../editor/EditRobotEditorState";
import { EditBugBaseEditorState } from "../editor/EditBugBaseEditorState";
import { EditThrowerEditorState } from "../editor/EditThrowerEditorState";
import { EditSkeletonEditorState } from "../editor/EditSkeletonEditorState";
import { EditBulletDudeEditorState } from "../editor/EditBulletDudeEditorState";
import { AddEditorState } from "../editor/AddEditorState";
import { AddRobotEditorState } from "../editor/AddRobotEditorState";
import { AddBugBaseEditorState } from "../editor/AddBugBaseEditorState";
import { AddThrowerEditorState } from "../editor/AddThrowerEditorState";
import { AddSkeletonEditorState } from "../editor/AddSkeletonEditorState";
import { AddBulletDudeEditorState } from "../editor/AddBulletDudeEditorState";
import { SpawnerEditorState } from "../editor/SpawnerEditorState";
import { TextureEditorState } from "../editor/TextureEditorState";
import { ThemeEditorState } from "../editor/ThemeEditorState";
import { TriggerEditorState } from "../editor/TriggerEditorState";
import { PatrolComponent } from "../ecs/components/ai/PatrolComponent";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { DifficultyComponent } from "../ecs/components/ai/DifficultyComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { EntityManager } from "../ecs/EntityManager";

export default class EditorScene extends Phaser.Scene {
  private stateMachine!: StateMachine<void | Entity | MoveEditorStateProps>;
  private title!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private originalLevelData!: string;
  private readonly cameraSpeed = 400;
  private triggerGraphics: Phaser.GameObjects.Graphics | null = null;
  private inTriggerState: boolean = false;

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

    // Hide HUD
    const hudScene = this.scene.get('HudScene') as HudScene;
    if (hudScene) {
      hudScene.scene.setVisible(false);
    }

    // Enable debug grid
    grid.setGridDebugEnabled(true);

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
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = {
        W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };

      // ESC to exit
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
        this.exitEditor();
      });
    }

    // Initialize state machine
    this.stateMachine = new StateMachine<void | Entity | MoveEditorStateProps | number>({
      default: new DefaultEditorState(this),
      grid: new GridEditorState(this),
      resize: new ResizeEditorState(this),
      move: new MoveEditorState(this),
      editRobot: new EditRobotEditorState(this),
      editBugBase: new EditBugBaseEditorState(this),
      editThrower: new EditThrowerEditorState(this),
      editSkeleton: new EditSkeletonEditorState(this),
      editBulletDude: new EditBulletDudeEditorState(this),
      add: new AddEditorState(this),
      addRobot: new AddRobotEditorState(this),
      addBugBase: new AddBugBaseEditorState(this),
      addThrower: new AddThrowerEditorState(this),
      addSkeleton: new AddSkeletonEditorState(this),
      addBulletDude: new AddBulletDudeEditorState(this),
      spawner: new SpawnerEditorState(this),
      texture: new TextureEditorState(this),
      theme: new ThemeEditorState(this),
      trigger: new TriggerEditorState(this) as unknown as import('../systems/state/IState').IState<void | Entity | MoveEditorStateProps | number>
    }, 'default');

    // Event listeners
    this.events.on('changeEditorState', (stateName: string) => {
      this.stateMachine.enter(stateName);
    });

  }

  update(_time: number, delta: number): void {
    this.stateMachine.update(delta);
    this.handleCameraMovement(delta);
    this.renderTriggers();
  }

  private renderTriggers(): void {
    if (this.inTriggerState) return;

    const gameScene = this.scene.get('game') as GameScene;
    const levelData = gameScene.getLevelData();
    const grid = this.getGrid();

    if (this.triggerGraphics) {
      this.triggerGraphics.destroy();
      this.triggerGraphics = null;
    }

    if (!levelData.triggers || levelData.triggers.length === 0) return;

    this.triggerGraphics = gameScene.add.graphics();
    this.triggerGraphics.setDepth(1500);

    for (const trigger of levelData.triggers) {
      this.triggerGraphics.lineStyle(3, 0xffff00, 0.8);
      this.triggerGraphics.fillStyle(0xffff00, 0.2);

      for (const cell of trigger.triggerCells) {
        const worldPos = grid.cellToWorld(cell.col, cell.row);
        this.triggerGraphics.strokeRect(worldPos.x, worldPos.y, grid.cellSize, grid.cellSize);
        this.triggerGraphics.fillRect(worldPos.x, worldPos.y, grid.cellSize, grid.cellSize);
      }
    }
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

  setCellData(col: number, row: number, data: { layer?: number; properties?: Set<CellProperty>; backgroundTexture?: string }): void {
    const grid = this.getGrid();
    grid.setCell(col, row, data);
    grid.render(); // Force re-render to show changes
  }

  hasUnsavedChanges(): boolean {
    const current = JSON.stringify(this.getCurrentLevelData());
    return current !== this.originalLevelData;
  }

  private extractGridCells(grid: Grid): Array<{
    col: number;
    row: number;
    layer: number;
    properties?: CellProperty[];
    backgroundTexture?: string;
  }> {
    const cells = [];
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;

        const layer = grid.getLayer(cell);
        if (layer !== 0 || cell.properties.size > 0 || cell.backgroundTexture) {
          cells.push({
            col,
            row,
            layer,
            properties: cell.properties.size > 0 ? Array.from(cell.properties) : undefined,
            backgroundTexture: cell.backgroundTexture
          });
        }
      }
    }
    return cells;
  }

  private extractRobots(entityManager: EntityManager, grid: Grid): Array<{
    col: number;
    row: number;
    difficulty: EnemyDifficulty;
    waypoints: Array<{ col: number; row: number }>;
  }> {
    const robots: Array<{
      col: number;
      row: number;
      difficulty: EnemyDifficulty;
      waypoints: Array<{ col: number; row: number }>;
    }> = [];

    const entities = entityManager.getAll();
    for (const entity of entities) {
      const patrol = entity.get(PatrolComponent);
      if (patrol) {
        const sprite = entity.get(SpriteComponent);
        const difficultyComp = entity.get(DifficultyComponent);
        if (sprite && difficultyComp) {
          const cell = grid.worldToCell(sprite.sprite.x, sprite.sprite.y);
          robots.push({
            col: cell.col,
            row: cell.row,
            difficulty: difficultyComp.difficulty as EnemyDifficulty,
            waypoints: [...patrol.waypoints]
          });
        }
      }
    }
    return robots;
  }

  private extractBugBases(entityManager: EntityManager, grid: Grid): LevelBugBase[] {
    const bugBases: LevelBugBase[] = [];
    const bugBaseEntities = entityManager.getByType('bug_base');

    for (const bugBase of bugBaseEntities) {
      const transform = bugBase.get(TransformComponent);
      const difficulty = bugBase.get(DifficultyComponent);

      if (transform) {
        const cell = grid.worldToCell(transform.x, transform.y);

        bugBases.push({
          col: cell.col,
          row: cell.row,
          difficulty: difficulty?.difficulty ?? 'medium'
        });
      }
    }
    return bugBases;
  }

  private extractThrowers(entityManager: EntityManager, grid: Grid): import('../systems/level/LevelLoader').LevelThrower[] {
    const throwers: import('../systems/level/LevelLoader').LevelThrower[] = [];
    const throwerEntities = entityManager.getByType('thrower');

    for (const thrower of throwerEntities) {
      const transform = thrower.get(TransformComponent);
      const difficulty = thrower.get(DifficultyComponent);

      if (transform) {
        const cell = grid.worldToCell(transform.x, transform.y);

        throwers.push({
          id: thrower.entityId,
          col: cell.col,
          row: cell.row,
          difficulty: difficulty?.difficulty ?? 'medium'
        });
      }
    }
    return throwers;
  }

  private extractSkeletons(entityManager: EntityManager, grid: Grid): import('../systems/level/LevelLoader').LevelSkeleton[] {
    const skeletons: import('../systems/level/LevelLoader').LevelSkeleton[] = [];
    const skeletonEntities = entityManager.getByType('skeleton');

    for (const skeleton of skeletonEntities) {
      const transform = skeleton.get(TransformComponent);
      const difficulty = skeleton.get(DifficultyComponent);

      if (transform) {
        const cell = grid.worldToCell(transform.x, transform.y);
        const id = (skeleton as { skeletonId?: string }).skeletonId;

        skeletons.push({
          col: cell.col,
          row: cell.row,
          difficulty: difficulty?.difficulty ?? 'easy',
          id: id ?? undefined
        });
      }
    }
    return skeletons;
  }

  private extractBulletDudes(entityManager: EntityManager, grid: Grid): import('../systems/level/LevelLoader').LevelBulletDude[] {
    const bulletDudes: import('../systems/level/LevelLoader').LevelBulletDude[] = [];
    const bulletDudeEntities = entityManager.getByType('bulletdude');

    for (const bulletDude of bulletDudeEntities) {
      const transform = bulletDude.get(TransformComponent);
      const difficulty = bulletDude.get(DifficultyComponent);

      if (transform) {
        const cell = grid.worldToCell(transform.x, transform.y);
        const id = (bulletDude as { spawnerId?: string }).spawnerId;

        bulletDudes.push({
          col: cell.col,
          row: cell.row,
          difficulty: difficulty?.difficulty ?? 'easy',
          id: id ?? undefined
        });
      }
    }
    return bulletDudes;
  }

  getCurrentLevelData(): LevelData {
    const grid = this.getGrid();
    const gameScene = this.scene.get('game') as GameScene;
    const entityManager = gameScene.getEntityManager();

    const cells = this.extractGridCells(grid);
    const robots = this.extractRobots(entityManager, grid);
    const bugBases = this.extractBugBases(entityManager, grid);
    const throwers = this.extractThrowers(entityManager, grid);
    const skeletons = this.extractSkeletons(entityManager, grid);
    const bulletDudes = this.extractBulletDudes(entityManager, grid);

    const player = entityManager.getFirst('player');
    const playerTransform = player?.get(TransformComponent);
    const playerStart = playerTransform
      ? grid.worldToCell(playerTransform.x, playerTransform.y)
      : { col: 10, row: 10 };

    // Get existing level data to preserve triggers and spawners added in editor
    const existingLevelData = gameScene.getLevelData();

    const result = {
      width: grid.width,
      height: grid.height,
      playerStart: { x: playerStart.col, y: playerStart.row },
      cells,
      robots: robots.length > 0 ? robots : undefined,
      bugBases: bugBases.length > 0 ? bugBases : undefined,
      throwers: throwers.length > 0 ? throwers : undefined,
      skeletons: skeletons.length > 0 ? skeletons : undefined,
      bulletDudes: bulletDudes.length > 0 ? bulletDudes : undefined,
      triggers: existingLevelData.triggers,
      spawners: existingLevelData.spawners,
      levelTheme: existingLevelData.levelTheme,
      background: existingLevelData.background
    };

    return result;
  }

  saveLevel(): void {
    const levelData = this.getCurrentLevelData();
    const json = JSON.stringify(levelData, null, 2);

    // Log to console for easy copy/paste
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
    this.inTriggerState = false;
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
      entity = entityManager.getFirst('player') ?? undefined;
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

  enterAddBugBaseMode(): void {
    this.stateMachine.enter('addBugBase');
  }

  enterEditBugBaseMode(bugBase: Entity): void {
    this.stateMachine.enter('editBugBase', bugBase);
  }

  enterAddThrowerMode(): void {
    this.stateMachine.enter('addThrower');
  }

  enterEditThrowerMode(thrower: Entity): void {
    this.stateMachine.enter('editThrower', thrower);
  }

  enterAddSkeletonMode(): void {
    this.stateMachine.enter('addSkeleton');
  }

  enterEditSkeletonMode(skeleton: Entity): void {
    this.stateMachine.enter('editSkeleton', skeleton);
  }

  enterAddBulletDudeMode(): void {
    this.stateMachine.enter('addBulletDude');
  }

  enterEditBulletDudeMode(bulletDude: Entity): void {
    this.stateMachine.enter('editBulletDude', bulletDude);
  }

  enterSpawnerMode(): void {
    this.stateMachine.enter('spawner');
  }

  enterTextureMode(): void {
    this.stateMachine.enter('texture');
  }

  enterTriggerMode(triggerIndex?: number): void {
    this.inTriggerState = true;
    if (this.triggerGraphics) {
      this.triggerGraphics.destroy();
      this.triggerGraphics = null;
    }
    if (triggerIndex === undefined) {
      this.stateMachine.enter('trigger');
    } else {
      this.stateMachine.enter('trigger', triggerIndex as unknown as void | Entity | MoveEditorStateProps);
    }
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
            properties: new Set(nextCell.properties)
          });
        }
      }
    }

    // Remove last row by resizing
    grid.removeRow();
    this.updateGridSize();
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
            properties: new Set(nextCell.properties)
          });
        }
      }
    }

    // Remove last column by resizing
    grid.removeColumn();
    this.updateGridSize();
  }

  addRow(): void {
    const grid = this.getGrid();
    grid.addRow();
    this.updateGridSize();
  }

  addColumn(): void {
    const grid = this.getGrid();
    grid.addColumn();
    this.updateGridSize();
  }

  private updateGridSize(): void {
    const gameScene = this.scene.get('game') as GameScene;
    const grid = this.getGrid();

    // Update camera bounds
    const newWidth = grid.width * grid.cellSize;
    const newHeight = grid.height * grid.cellSize;
    gameScene.cameras.main.setBounds(-10000, -10000, 20000, 20000);

    // Update stored bounds for when we exit editor
    this.registry.set('editorOriginalBounds', {
      x: 0,
      y: 0,
      width: newWidth,
      height: newHeight
    });

    // Re-render grid
    grid.render();
  }

  cycleTheme(): void {
    this.stateMachine.enter('theme');
  }

  setTheme(theme: 'dungeon' | 'swamp'): void {
    const gameScene = this.scene.get('game') as GameScene;
    gameScene.setTheme(theme);
  }

  enterColorPickerMode(data: { colorKey: string; currentColor: string; onColorSelected: (color: string) => void }): void {
    this.stateMachine.enter('colorPicker', data as never);
  }

  exitEditor(): void {
    if (this.triggerGraphics) {
      this.triggerGraphics.destroy();
      this.triggerGraphics = null;
    }

    const gameScene = this.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const bounds = this.registry.get('editorOriginalBounds') as { x: number; y: number; width: number; height: number };

    if (bounds) {
      camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    const entityManager = gameScene.getEntityManager();
    const player = entityManager.getFirst('player');
    if (player) {
      const sprite = player.get(SpriteComponent);
      if (sprite) {
        camera.startFollow(sprite.sprite, true, 0.1, 0.1);
      }
    }

    const hudScene = this.scene.get('HudScene') as HudScene;
    if (hudScene) {
      hudScene.scene.setVisible(true);
      hudScene.setEditorActive(false);
    }

    this.scene.resume('game');
    this.scene.stop();
  }
}
