import Phaser from 'phaser';
import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';
import type { IStateEnterProps } from '../utils/state/IState';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { PatrolComponent } from '../ecs/components/ai/PatrolComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { getRobotDifficultyConfig, type RobotDifficulty } from '../robot/RobotDifficulty';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { FireballPropertiesComponent } from '../ecs/components/ai/FireballPropertiesComponent';

export class EditRobotEditorState extends EditorState<Entity | undefined> {
  private selectedRobot: Entity | null = null;
  private uiContainer: Phaser.GameObjects.Container | null = null;
  private difficultyText: Phaser.GameObjects.Text | null = null;
  private waypointMarkers: Phaser.GameObjects.Container[] = [];
  private draggingWaypointIndex: number | null = null;

  onEnter(props?: IStateEnterProps<Entity | undefined>): void {
    this.createUI();
    this.setupClickHandler();
    
    // Setup waypoint drag handlers
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    
    // If a robot was passed in, select it immediately
    if (props?.data) {
      this.selectedRobot = props.data;
      this.updateUI();
      this.renderWaypoints();
    } else {
      // Otherwise check if we clicked on a robot to enter this state
      this.checkRobotClick();
    }
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.destroyUI();
    this.destroyWaypoints();
    this.selectedRobot = null;
    this.draggingWaypointIndex = null;
  }

  onUpdate(_delta: number): void {
    // Update UI if robot is selected
    if (this.selectedRobot) {
      this.updateUI();
    }
  }

  private setupClickHandler(): void {
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Check if we clicked a waypoint first
    if (this.checkWaypointClick(pointer)) {
      return;
    }
    
    // Otherwise check for robot click
    this.checkRobotClick();
  }

  private checkWaypointClick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.selectedRobot) return false;

    const patrol = this.selectedRobot.require(PatrolComponent);

    const gameScene = this.scene.scene.get('game') as Phaser.Scene & {
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    // Check each waypoint
    for (let i = 0; i < patrol.waypoints.length; i++) {
      const waypoint = patrol.waypoints[i];
      const wpWorldX = waypoint.col * grid.cellSize + grid.cellSize / 2;
      const wpWorldY = waypoint.row * grid.cellSize + grid.cellSize / 2;

      const distance = Math.hypot(worldX - wpWorldX, worldY - wpWorldY);
      if (distance <= 20) {
        this.draggingWaypointIndex = i;
        return true;
      }
    }

    return false;
  }

  private checkRobotClick(): void {
    // If we're dragging a waypoint, don't check for robot clicks
    if (this.draggingWaypointIndex !== null) return;

    const pointer = this.scene.input.activePointer;
    
    // Get world coordinates from GameScene camera
    const gameScene = this.scene.scene.get('game') as Phaser.Scene & { 
      entityManager: { getByType: (type: string) => Entity[] };
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    
    const worldX = pointer.x + gameScene.cameras.main.scrollX;
    const worldY = pointer.y + gameScene.cameras.main.scrollY;

    if (this.selectedRobot) {
      const transform = this.selectedRobot.require(TransformComponent);
      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      if (distance < 64) {
        this.scene.enterMoveMode(this.selectedRobot, 'editRobot');
        return;
      }
    }

    const robots = gameScene.entityManager.getByType('stalking_robot');

    for (const robot of robots) {
      const transform = robot.require(TransformComponent);

      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      
      if (distance < 64) {
        this.selectedRobot = robot;
        this.updateUI();
        this.renderWaypoints();
        break;
      }
    }
  }

  private createUI(): void {
    const camera = this.scene.cameras.main;
    const x = camera.width - 250;
    const y = 150;

    this.uiContainer = this.scene.add.container(x, y);
    this.uiContainer.setScrollFactor(0);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, 240, 300, 0x000000, 0.8);
    this.uiContainer.add(bg);

    // Title
    const title = this.scene.add.text(0, -120, 'Edit Robot', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.uiContainer.add(title);

    // Instructions
    const instructions = this.scene.add.text(0, -90, 'Click a robot to edit', {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.uiContainer.add(instructions);

    // Difficulty label and value
    const difficultyLabel = this.scene.add.text(-100, -50, 'Difficulty:', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiContainer.add(difficultyLabel);

    this.difficultyText = this.scene.add.text(0, -20, 'MEDIUM', {
      fontSize: '18px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.uiContainer.add(this.difficultyText);

    // Difficulty buttons
    const easyButton = this.createButton(-70, 20, 'Easy', () => this.setDifficulty('easy'));
    const mediumButton = this.createButton(0, 20, 'Medium', () => this.setDifficulty('medium'));
    const hardButton = this.createButton(70, 20, 'Hard', () => this.setDifficulty('hard'));
    this.uiContainer.add([easyButton, mediumButton, hardButton]);

    // Back button
    const backButton = this.createButton(0, 70, 'Back', () => {
      this.scene.enterDefaultMode();
    });
    this.uiContainer.add(backButton);

    // Add Waypoint button
    const addWaypointButton = this.createButton(0, 110, 'Add Waypoint', () => {
      this.addWaypoint();
    });
    this.uiContainer.add(addWaypointButton);

    // Delete Waypoint button
    const deleteWaypointButton = this.createButton(0, 150, 'Delete Waypoint', () => {
      this.deleteWaypoint();
    });
    this.uiContainer.add(deleteWaypointButton);
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, 50, 30, 0x444444);
    bg.setInteractive({ useHandCursor: true });
    bg.setDepth(1001); // Above UI container

    const label = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    label.setDepth(1001);

    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });
    bg.on('pointerover', () => bg.setFillStyle(0x666666));
    bg.on('pointerout', () => bg.setFillStyle(0x444444));

    container.add([bg, label]);
    return container;
  }

  private updateUI(): void {
    if (!this.selectedRobot || !this.difficultyText) return;

    const difficultyComp = this.selectedRobot.get(DifficultyComponent<RobotDifficulty>);
    if (difficultyComp) {
      this.difficultyText.setText(difficultyComp.difficulty.toUpperCase());
      
      // Color based on difficulty
      const colors = { easy: '#00ff00', medium: '#ffff00', hard: '#ff0000' };
      this.difficultyText.setColor(colors[difficultyComp.difficulty]);
    }
  }

  private setDifficulty(difficulty: RobotDifficulty): void {
    if (!this.selectedRobot) return;

    const difficultyComp = this.selectedRobot.get(DifficultyComponent<RobotDifficulty>);
    if (difficultyComp) {
      difficultyComp.difficulty = difficulty;
      
      const config = getRobotDifficultyConfig(difficulty);
      
      const health = this.selectedRobot.require(HealthComponent);
      health.setMaxHealth(config.health);
      health.heal(config.health);
      
      const patrol = this.selectedRobot.require(PatrolComponent);
      patrol.speed = config.speed;
      
      const fireballProps = this.selectedRobot.require(FireballPropertiesComponent);
      fireballProps.speed = config.fireballSpeed;
      fireballProps.duration = config.fireballDuration;
      
      this.updateUI();
    }
  }

  private destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
    this.difficultyText = null;
  }

  private renderWaypoints(): void {
    if (!this.selectedRobot) return;

    // Destroy existing waypoint markers
    this.destroyWaypoints();

    const patrol = this.selectedRobot.get(PatrolComponent);
    if (!patrol) return;

    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();

    patrol.waypoints.forEach((waypoint, index) => {
      const worldX = waypoint.col * grid.cellSize + grid.cellSize / 2;
      const worldY = waypoint.row * grid.cellSize + grid.cellSize / 2;

      const container = gameScene.add.container(worldX, worldY);

      // Circle background
      const circle = gameScene.add.circle(0, 0, 20, 0x00ffff, 0.8);
      circle.setStrokeStyle(2, 0xffffff);
      container.add(circle);

      // Number text
      const text = gameScene.add.text(0, 0, (index + 1).toString(), {
        fontSize: '20px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(text);

      container.setDepth(1000);

      this.waypointMarkers.push(container);
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.draggingWaypointIndex === null || !this.selectedRobot) return;

    const gameScene = this.scene.scene.get('game') as Phaser.Scene & {
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    const grid = this.scene.getGrid();
    const camera = gameScene.cameras.main;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);
    const cellWorld = grid.cellToWorld(cell.col, cell.row);
    
    // Center of cell
    const centerX = cellWorld.x + grid.cellSize / 2;
    const centerY = cellWorld.y + grid.cellSize / 2;

    // Update waypoint marker position
    const marker = this.waypointMarkers[this.draggingWaypointIndex];
    if (marker) {
      marker.setPosition(centerX, centerY);
    }

    // Update waypoint data
    const patrol = this.selectedRobot.get(PatrolComponent);
    if (patrol) {
      patrol.waypoints[this.draggingWaypointIndex].col = cell.col;
      patrol.waypoints[this.draggingWaypointIndex].row = cell.row;
    }
  }

  private handlePointerUp(): void {
    this.draggingWaypointIndex = null;
  }

  private addWaypoint(): void {
    if (!this.selectedRobot) return;

    const patrol = this.selectedRobot.get(PatrolComponent);
    if (!patrol) return;

    const sprite = this.selectedRobot.get(SpriteComponent);
    if (!sprite) return;

    const grid = this.scene.getGrid();
    const robotCell = grid.worldToCell(sprite.sprite.x, sprite.sprite.y);

    // Find an unoccupied cell around the robot
    const offsets = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 0, row: -1 },
      { col: 1, row: 1 },
      { col: -1, row: 1 },
      { col: 1, row: -1 },
      { col: -1, row: -1 }
    ];

    for (const offset of offsets) {
      const col = robotCell.col + offset.col;
      const row = robotCell.row + offset.row;
      const cell = grid.getCell(col, row);

      if (cell?.layer === 0 && !grid.isOccupied(col, row)) {
        patrol.waypoints.push({ col, row });
        this.renderWaypoints();
        return;
      }
    }

    // If no adjacent cell is free, just add at robot position
    patrol.waypoints.push({ col: robotCell.col, row: robotCell.row });
    this.renderWaypoints();
  }

  private deleteWaypoint(): void {
    if (!this.selectedRobot) return;

    const patrol = this.selectedRobot.get(PatrolComponent);
    if (!patrol || patrol.waypoints.length === 0) return;

    patrol.waypoints.pop();
    this.renderWaypoints();
  }

  private destroyWaypoints(): void {
    this.waypointMarkers.forEach(marker => marker.destroy());
    this.waypointMarkers = [];
  }
}
