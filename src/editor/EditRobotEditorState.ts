import Phaser from 'phaser';
import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';
import type { IStateEnterProps } from '../utils/state/IState';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { PatrolComponent } from '../ecs/components/PatrolComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { FireballPropertiesComponent } from '../ecs/components/FireballPropertiesComponent';

export class EditRobotEditorState extends EditorState<Entity | undefined> {
  private selectedRobot: Entity | null = null;
  private uiContainer: Phaser.GameObjects.Container | null = null;
  private healthText: Phaser.GameObjects.Text | null = null;
  private speedText: Phaser.GameObjects.Text | null = null;
  private fireballSpeedText: Phaser.GameObjects.Text | null = null;
  private fireballDurationText: Phaser.GameObjects.Text | null = null;
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

    const patrol = this.selectedRobot.get(PatrolComponent);
    if (!patrol) return false;

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

    // If we already have a selected robot, check if clicking on it again to move it
    if (this.selectedRobot) {
      const transform = this.selectedRobot.get(TransformComponent);
      if (transform) {
        const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
        if (distance < 64) {
          // Clicking on selected robot - enter move mode with return to editRobot
          this.scene.enterMoveMode(this.selectedRobot, 'editRobot');
          return;
        }
      }
    }

    // Otherwise, select a robot
    const robots = gameScene.entityManager.getByType('stalking_robot');

    for (const robot of robots) {
      const transform = robot.get(TransformComponent);
      if (!transform) continue;

      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      
      if (distance < 64) { // Click radius
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

    // Background panel (taller to fit fireball properties)
    const bg = this.scene.add.rectangle(0, 0, 240, 520, 0x000000, 0.8);
    this.uiContainer.add(bg);

    // Title
    const title = this.scene.add.text(0, -220, 'Edit Robot', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.uiContainer.add(title);

    // Instructions
    const instructions = this.scene.add.text(0, -190, 'Click a robot to edit', {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.uiContainer.add(instructions);

    // Health label and value
    const healthLabel = this.scene.add.text(-100, -140, 'Health:', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiContainer.add(healthLabel);

    this.healthText = this.scene.add.text(50, -140, '100', {
      fontSize: '16px',
      color: '#00ff00'
    });
    this.uiContainer.add(this.healthText);

    // Health buttons
    const healthMinus = this.createButton(-100, -110, '-10', () => this.adjustHealth(-10));
    const healthPlus = this.createButton(-40, -110, '+10', () => this.adjustHealth(10));
    this.uiContainer.add([healthMinus, healthPlus]);

    // Speed label and value
    const speedLabel = this.scene.add.text(-100, -70, 'Speed:', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiContainer.add(speedLabel);

    this.speedText = this.scene.add.text(50, -70, '100', {
      fontSize: '16px',
      color: '#00ffff'
    });
    this.uiContainer.add(this.speedText);

    // Speed buttons
    const speedMinus = this.createButton(-100, -40, '-10', () => this.adjustSpeed(-10));
    const speedPlus = this.createButton(-40, -40, '+10', () => this.adjustSpeed(10));
    this.uiContainer.add([speedMinus, speedPlus]);

    // Fireball Speed label and value
    const fireballSpeedLabel = this.scene.add.text(-100, 0, 'FB Speed:', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiContainer.add(fireballSpeedLabel);

    this.fireballSpeedText = this.scene.add.text(50, 0, '300', {
      fontSize: '16px',
      color: '#ff8800'
    });
    this.uiContainer.add(this.fireballSpeedText);

    // Fireball Speed buttons
    const fbSpeedMinus = this.createButton(-100, 30, '-50', () => this.adjustFireballSpeed(-50));
    const fbSpeedPlus = this.createButton(-40, 30, '+50', () => this.adjustFireballSpeed(50));
    this.uiContainer.add([fbSpeedMinus, fbSpeedPlus]);

    // Fireball Duration label and value
    const fireballDurationLabel = this.scene.add.text(-100, 70, 'FB Duration:', {
      fontSize: '16px',
      color: '#ffffff'
    });
    this.uiContainer.add(fireballDurationLabel);

    this.fireballDurationText = this.scene.add.text(50, 70, '2000', {
      fontSize: '16px',
      color: '#ff8800'
    });
    this.uiContainer.add(this.fireballDurationText);

    // Fireball Duration buttons
    const fbDurationMinus = this.createButton(-100, 100, '-100', () => this.adjustFireballDuration(-100));
    const fbDurationPlus = this.createButton(-40, 100, '+100', () => this.adjustFireballDuration(100));
    this.uiContainer.add([fbDurationMinus, fbDurationPlus]);

    // Back button
    const backButton = this.createButton(0, 170, 'Back', () => {
      this.scene.enterDefaultMode();
    });
    this.uiContainer.add(backButton);

    // Add Waypoint button
    const addWaypointButton = this.createButton(0, 210, 'Add Waypoint', () => {
      this.addWaypoint();
    });
    this.uiContainer.add(addWaypointButton);

    // Delete Waypoint button
    const deleteWaypointButton = this.createButton(0, 250, 'Delete Waypoint', () => {
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
    if (!this.selectedRobot || !this.healthText || !this.speedText || !this.fireballSpeedText || !this.fireballDurationText) return;

    const health = this.selectedRobot.get(HealthComponent);
    const patrol = this.selectedRobot.get(PatrolComponent);
    const fireballProps = this.selectedRobot.get(FireballPropertiesComponent);

    if (health) {
      this.healthText.setText(health.getHealth().toString());
    }

    if (patrol) {
      this.speedText.setText(patrol.speed.toString());
    }

    if (fireballProps) {
      this.fireballSpeedText.setText(fireballProps.speed.toString());
      this.fireballDurationText.setText(fireballProps.duration.toString());
    }
  }

  private adjustHealth(delta: number): void {
    if (!this.selectedRobot) return;

    const health = this.selectedRobot.get(HealthComponent);
    if (health) {
      const newHealth = Math.max(1, Math.min(1000, health.getHealth() + delta));
      health.setHealth(newHealth);
      this.updateUI();
    }
  }

  private adjustSpeed(delta: number): void {
    if (!this.selectedRobot) return;

    const patrol = this.selectedRobot.get(PatrolComponent);
    if (patrol) {
      patrol.speed = Math.max(10, Math.min(500, patrol.speed + delta));
      this.updateUI();
    }
  }

  private adjustFireballSpeed(delta: number): void {
    if (!this.selectedRobot) return;

    const fireballProps = this.selectedRobot.get(FireballPropertiesComponent);
    if (fireballProps) {
      fireballProps.speed = Math.max(50, Math.min(1000, fireballProps.speed + delta));
      this.updateUI();
    }
  }

  private adjustFireballDuration(delta: number): void {
    if (!this.selectedRobot) return;

    const fireballProps = this.selectedRobot.get(FireballPropertiesComponent);
    if (fireballProps) {
      fireballProps.duration = Math.max(500, Math.min(10000, fireballProps.duration + delta));
      this.updateUI();
    }
  }

  private destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.destroy();
      this.uiContainer = null;
    }
    this.healthText = null;
    this.speedText = null;
    this.fireballSpeedText = null;
    this.fireballDurationText = null;
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
