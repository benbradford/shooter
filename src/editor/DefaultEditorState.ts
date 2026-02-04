import { EditorState } from './EditorState';
import { TransformComponent } from '../ecs/components/core/TransformComponent';

export class DefaultEditorState extends EditorState {
  private exitButton!: Phaser.GameObjects.Text;
  private gridButton!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(): void {
    
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const buttonY = height - 50;
    const buttonSpacing = 120;
    const centerX = width / 2;

    // Setup click handler for robot selection
    this.scene.input.on('pointerdown', this.handleClick, this);

    // Exit button
    this.exitButton = this.scene.add.text(centerX - buttonSpacing * 2, buttonY, 'Exit', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.exitButton.setOrigin(0.5);
    this.exitButton.setScrollFactor(0);
    this.exitButton.setInteractive({ useHandCursor: true });
    this.exitButton.setDepth(1000);
    this.buttons.push(this.exitButton);

    this.exitButton.on('pointerover', () => {
      this.exitButton.setBackgroundColor('#555555');
    });
    this.exitButton.on('pointerout', () => {
      this.exitButton.setBackgroundColor('#333333');
    });
    this.exitButton.on('pointerdown', () => {
      this.scene.exitEditor();
    });

    // Grid button
    this.gridButton = this.scene.add.text(centerX - buttonSpacing, buttonY, 'Grid', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    this.gridButton.setOrigin(0.5);
    this.gridButton.setScrollFactor(0);
    this.gridButton.setInteractive({ useHandCursor: true });
    this.gridButton.setDepth(1000);
    this.buttons.push(this.gridButton);

    this.gridButton.on('pointerover', () => {
      this.gridButton.setBackgroundColor('#555555');
    });
    this.gridButton.on('pointerout', () => {
      this.gridButton.setBackgroundColor('#333333');
    });
    this.gridButton.on('pointerdown', () => {
      this.scene.enterGridMode();
    });

    // Add button
    const addButton = this.scene.add.text(centerX, buttonY, 'Add', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    addButton.setOrigin(0.5);
    addButton.setScrollFactor(0);
    addButton.setInteractive({ useHandCursor: true });
    addButton.setDepth(1000);
    this.buttons.push(addButton);

    addButton.on('pointerover', () => {
      addButton.setBackgroundColor('#555555');
    });
    addButton.on('pointerout', () => {
      addButton.setBackgroundColor('#333333');
    });
    addButton.on('pointerdown', () => {
      this.scene.enterAddMode();
    });

    // Texture button
    const textureButton = this.scene.add.text(centerX + buttonSpacing, buttonY, 'Texture', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    textureButton.setOrigin(0.5);
    textureButton.setScrollFactor(0);
    textureButton.setInteractive({ useHandCursor: true });
    textureButton.setDepth(1000);
    this.buttons.push(textureButton);

    textureButton.on('pointerover', () => {
      textureButton.setBackgroundColor('#555555');
    });
    textureButton.on('pointerout', () => {
      textureButton.setBackgroundColor('#333333');
    });
    textureButton.on('pointerdown', () => {
      this.scene.enterTextureMode();
    });

    // Resize button
    const resizeButton = this.scene.add.text(centerX + buttonSpacing * 2, buttonY, 'Resize', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    resizeButton.setOrigin(0.5);
    resizeButton.setScrollFactor(0);
    resizeButton.setInteractive({ useHandCursor: true });
    resizeButton.setDepth(1000);
    this.buttons.push(resizeButton);

    resizeButton.on('pointerover', () => {
      resizeButton.setBackgroundColor('#555555');
    });
    resizeButton.on('pointerout', () => {
      resizeButton.setBackgroundColor('#333333');
    });
    resizeButton.on('pointerdown', () => {
      this.scene.enterResizeMode();
    });

    // Log button
    const logButton = this.scene.add.text(centerX + buttonSpacing * 3, buttonY, 'Log', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    logButton.setOrigin(0.5);
    logButton.setScrollFactor(0);
    logButton.setInteractive({ useHandCursor: true });
    logButton.setDepth(1000);
    this.buttons.push(logButton);

    logButton.on('pointerover', () => {
      logButton.setBackgroundColor('#555555');
    });
    logButton.on('pointerout', () => {
      logButton.setBackgroundColor('#333333');
    });
    logButton.on('pointerdown', () => {
      this.scene.logLevel();
    });

    // Theme button
    const themeButton = this.scene.add.text(centerX - buttonSpacing * 3, buttonY, 'Theme', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    themeButton.setOrigin(0.5);
    themeButton.setScrollFactor(0);
    themeButton.setInteractive({ useHandCursor: true });
    themeButton.setDepth(1000);
    this.buttons.push(themeButton);

    themeButton.on('pointerover', () => {
      themeButton.setBackgroundColor('#555555');
    });
    themeButton.on('pointerout', () => {
      themeButton.setBackgroundColor('#333333');
    });
    themeButton.on('pointerdown', () => {
      this.scene.cycleTheme();
    });

    // Trigger button
    const triggerButton = this.scene.add.text(centerX + buttonSpacing * 4, buttonY, 'Trigger', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    triggerButton.setOrigin(0.5);
    triggerButton.setScrollFactor(0);
    triggerButton.setInteractive({ useHandCursor: true });
    triggerButton.setDepth(1000);
    this.buttons.push(triggerButton);

    triggerButton.on('pointerover', () => {
      triggerButton.setBackgroundColor('#555555');
    });
    triggerButton.on('pointerout', () => {
      triggerButton.setBackgroundColor('#333333');
    });
    triggerButton.on('pointerdown', () => {
      this.scene.enterTriggerMode();
    });

    // Spawner button (second row)
    const spawnerButton = this.scene.add.text(centerX - buttonSpacing * 2, buttonY + 60, 'Spawner', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    spawnerButton.setOrigin(0.5);
    spawnerButton.setScrollFactor(0);
    spawnerButton.setInteractive({ useHandCursor: true });
    spawnerButton.setDepth(1000);
    this.buttons.push(spawnerButton);

    spawnerButton.on('pointerover', () => {
      spawnerButton.setBackgroundColor('#555555');
    });
    spawnerButton.on('pointerout', () => {
      spawnerButton.setBackgroundColor('#333333');
    });
    spawnerButton.on('pointerdown', () => {
      this.scene.enterSpawnerMode();
    });
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handleClick, this);
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

  onUpdate(_delta: number): void {
    // No update logic needed
  }

  private handleClick(): void {
    const pointer = this.scene.input.activePointer;
    
    const gameScene = this.scene.scene.get('game') as Phaser.Scene & { 
      getEntityManager: () => import('../ecs/EntityManager').EntityManager;
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
      getLevelData: () => import('../systems/level/LevelLoader').LevelData;
    };
    
    const worldX = pointer.x + gameScene.cameras.main.scrollX;
    const worldY = pointer.y + gameScene.cameras.main.scrollY;
    
    const grid = this.scene.getGrid();
    const clickedCell = grid.worldToCell(worldX, worldY);

    // Check for trigger click
    const levelData = gameScene.getLevelData();
    if (levelData.triggers) {
      for (let i = 0; i < levelData.triggers.length; i++) {
        const trigger = levelData.triggers[i];
        for (const cell of trigger.triggerCells) {
          if (cell.col === clickedCell.col && cell.row === clickedCell.row) {
            this.scene.enterTriggerMode(i);
            return;
          }
        }
      }
    }

    // Check for player click
    const entityManager = gameScene.getEntityManager();
    const player = entityManager.getFirst('player');
    if (player) {
      const transform = player.get(TransformComponent);
      if (transform) {
        const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
        if (distance < 64) {
          this.scene.enterMoveMode(player);
          return;
        }
      }
    }

    // Check for robot click
    const robots = entityManager.getByType('stalking_robot');

    for (const robot of robots) {
      const transform = robot.get(TransformComponent);
      if (!transform) continue;

      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      if (distance < 64) {
        this.scene.enterEditRobotMode(robot);
        return;
      }
    }

    // Check for bug base click
    const bugBases = entityManager.getByType('bug_base');

    for (const bugBase of bugBases) {
      const transform = bugBase.get(TransformComponent);
      if (!transform) continue;

      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      if (distance < 64) {
        this.scene.enterEditBugBaseMode(bugBase);
        return;
      }
    }

    // Check for thrower click
    const throwers = entityManager.getByType('thrower');

    for (const thrower of throwers) {
      const transform = thrower.get(TransformComponent);
      if (!transform) continue;

      const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
      if (distance < 64) {
        this.scene.enterEditThrowerMode(thrower);
        return;
      }
    }
  }
}
