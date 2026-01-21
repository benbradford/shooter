import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { LevelLoader } from "./level/LevelLoader";
import type { LevelData } from "./level/LevelLoader";
import { EntityManager } from "./ecs/EntityManager";
import { Entity } from "./ecs/Entity";
import { createPlayerEntity } from "./player/PlayerEntity";
import { createBulletEntity } from "./projectile/BulletEntity";
import { createShellCasingEntity } from "./projectile/ShellCasingEntity";
import { createJoystickEntity } from "./hud/JoystickEntity";
import { createStalkingRobotEntity } from "./robot/StalkingRobotEntity";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import { TransformComponent } from "./ecs/components/TransformComponent";
import { GridPositionComponent } from "./ecs/components/GridPositionComponent";
import { ProjectileEmitterComponent } from "./ecs/components/ProjectileEmitterComponent";
import { HealthComponent } from "./ecs/components/HealthComponent";
import { KnockbackComponent } from "./ecs/components/KnockbackComponent";
import { StateMachineComponent } from "./ecs/components/StateMachineComponent";
import { ProjectileComponent } from "./ecs/components/ProjectileComponent";
import { preloadAssets } from "./assets/AssetLoader";

export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  private grid!: Grid;
  private readonly cellSize: number = 128;
  private editorKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;

  constructor() {
    super("game");
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    // Initialize entity manager
    this.entityManager = new EntityManager();

    // Load level data
    this.levelData = await LevelLoader.load('default');

    // Initialize the scene
    this.initializeScene();

    // Editor mode toggle
    this.editorKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.editorKey.on('down', () => {
      if (this.scene.isActive()) {
        this.enterEditorMode();
      }
    });
  }

  private initializeScene(): void {
    const level = this.levelData;

    // Initialize grid
    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    // Apply level cells
    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer,
        isTransition: cell.isTransition
      });
    }

    this.grid.render();

    // Camera setup
    this.cameras.main.setBounds(
      0,
      0,
      level.width * this.grid.cellSize,
      level.height * this.grid.cellSize
    );

    // Spawn all entities
    this.spawnEntities();
  }

  private async enterEditorMode(): Promise<void> {
    // Reset the scene to initial state
    this.resetScene();

    // Pause this scene (stops updates but keeps rendering)
    this.scene.pause();

    // Launch editor scene on top
    this.scene.launch('EditorScene');
  }

  private resetScene(): void {
    // Destroy grid (clears occupants and graphics)
    this.grid.destroy();

    // Destroy all entities
    this.entityManager.destroyAll();

    // Reinitialize everything
    this.initializeScene();
  }

  private spawnEntities(): void {
    const level = this.levelData;

    // Create joystick entity
    const joystick = this.entityManager.add(createJoystickEntity(this));

    // Create the player entity at level start position
    const startX = this.grid.cellSize * level.playerStart.x;
    const startY = this.grid.cellSize * level.playerStart.y;
    const player = this.entityManager.add(createPlayerEntity(
      this,
      startX,
      startY,
      this.grid,
      (x, y, dirX, dirY) => {
        const gridPos = player.get(GridPositionComponent)!;
        const playerCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
        const fromTransition = playerCell?.isTransition ?? false;

        const bullet = createBulletEntity(this, x, y, dirX, dirY, this.grid, gridPos.currentLayer, fromTransition);
        this.entityManager.add(bullet);
      },
      (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.entityManager.add(shell);
      },
      joystick
    ));

    // Camera follow player's sprite
    const spriteComp = player.get(SpriteComponent)!;
    this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
    this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);

    // Spawn robots from level data
    if (level.robots && level.robots.length > 0) {
      for (const robotData of level.robots) {
        const x = robotData.col * this.grid.cellSize + this.grid.cellSize / 2;
        const y = robotData.row * this.grid.cellSize + this.grid.cellSize / 2;
        
        const robot = createStalkingRobotEntity(
          this,
          x,
          y,
          this.grid,
          player,
          robotData.waypoints,
          robotData.health,
          robotData.speed
        );
        this.entityManager.add(robot);
      }
    }
  }

  update(_time: number, delta: number): void {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid) return;

    // Update all entities (automatically filters destroyed ones)
    this.entityManager.update(delta);

    // Check bullet-robot collisions
    this.checkBulletRobotCollisions();

    // Debug: Draw emitter position for player
    if (this.grid.sceneDebugEnabled) {
      const player = this.entityManager.getFirst('player');
      if (player) {
        const emitter = player.get(ProjectileEmitterComponent);
        if (emitter) {
          const pos = emitter.getEmitterPosition();
          this.grid.renderEmitterBox(pos.x, pos.y, 20);
        }
      }
    }

    // Re-render the grid (debug only)
    this.grid.render();
  }

  private checkBulletRobotCollisions(): void {
    const bullets = this.entityManager.getByType('bullet');
    const robots = this.entityManager.getByType('stalking_robot');

    for (const bullet of bullets) {
      if (bullet.markedForRemoval) continue;

      const bulletTransform = bullet.get(TransformComponent);
      const bulletSprite = bullet.get(SpriteComponent);
      if (!bulletTransform || !bulletSprite) continue;

      for (const robot of robots) {
        if (this.checkBulletHitRobot(bullet, bulletTransform, robot)) {
          break;
        }
      }
    }
  }

  private checkBulletHitRobot(bullet: Entity, bulletTransform: TransformComponent, robot: Entity): boolean {
    if (robot.markedForRemoval) return false;

    const robotTransform = robot.get(TransformComponent);
    const robotSprite = robot.get(SpriteComponent);
    const robotHealth = robot.get(HealthComponent);
    const robotKnockback = robot.get(KnockbackComponent);
    const robotStateMachine = robot.get(StateMachineComponent);

    if (!robotTransform || !robotSprite || !robotHealth || !robotKnockback || !robotStateMachine) return false;

    // Check collision
    const dx = bulletTransform.x - robotTransform.x;
    const dy = bulletTransform.y - robotTransform.y;
    const distance = Math.hypot(dx, dy);

    if (distance >= 30) return false;

    // Damage robot
    robotHealth.takeDamage(10);

    // Apply knockback
    const bulletProjectile = bullet.get(ProjectileComponent);
    if (bulletProjectile && robotKnockback) {
      (robotKnockback as KnockbackComponent).applyKnockback(
        bulletProjectile.dirX,
        bulletProjectile.dirY,
        200
      );
    }

    // Transition to hit state
    robotStateMachine.stateMachine.enter('hit');

    // Transition to alert state if patrolling
    const currentState = robotStateMachine.stateMachine.getCurrentKey();
    if (currentState === 'patrol') {
      robotStateMachine.stateMachine.enter('alert');
    }

    // Remove bullet
    bullet.markForRemoval();
    return true;
  }

  getGrid(): Grid {
    return this.grid;
  }

  getPlayer(): Phaser.GameObjects.Sprite | null {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const sprite = player.get(SpriteComponent);
      return sprite ? sprite.sprite : null;
    }
    return null;
  }

  getPlayerEntity(): Entity | null {
    return this.entityManager.getFirst('player') || null;
  }

  getEntities(): Entity[] {
    return this.entityManager.getAll();
  }

  getPlayerStart(): { x: number; y: number } {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const transform = player.get(TransformComponent)!;
      return {
        x: Math.round(transform.x / this.grid.cellSize),
        y: Math.round(transform.y / this.grid.cellSize)
      };
    }
    return { x: 10, y: 10 }; // Default fallback
  }

  movePlayer(x: number, y: number): void {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const transform = player.get(TransformComponent)!;
      const sprite = player.get(SpriteComponent)!;
      transform.x = x;
      transform.y = y;
      sprite.sprite.setPosition(x, y);
    }
  }

  getLevelData(): LevelData {
    return this.levelData;
  }
}
