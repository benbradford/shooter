import { EditorState } from './EditorState';
import { TransformComponent } from '../ecs/components/core/TransformComponent';

export class DefaultEditorState extends EditorState {
  private saveButton!: Phaser.GameObjects.Text;
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

    // Save button
    this.saveButton = this.scene.add.text(centerX - buttonSpacing * 2.5, buttonY, 'Save', {
      fontSize: '24px',
      color: '#666666',
      backgroundColor: '#222222',
      padding: { x: 20, y: 10 }
    });
    this.saveButton.setOrigin(0.5);
    this.saveButton.setScrollFactor(0);
    this.saveButton.setDepth(1000);
    this.buttons.push(this.saveButton);

    // Exit button
    this.exitButton = this.scene.add.text(centerX - buttonSpacing * 1.5, buttonY, 'Exit', {
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
    this.gridButton = this.scene.add.text(centerX - buttonSpacing * 0.5, buttonY, 'Grid', {
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
    const addButton = this.scene.add.text(centerX + buttonSpacing * 0.5, buttonY, 'Add', {
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
    const textureButton = this.scene.add.text(centerX + buttonSpacing * 1.5, buttonY, 'Texture', {
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
    const resizeButton = this.scene.add.text(centerX + buttonSpacing * 2.5, buttonY, 'Resize', {
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
    const logButton = this.scene.add.text(centerX + buttonSpacing * 3.5, buttonY, 'Log', {
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
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handleClick, this);
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

  onUpdate(_delta: number): void {
    // Update save button state based on changes
    const hasChanges = this.scene.hasUnsavedChanges();
    if (hasChanges) {
      this.saveButton.setColor('#ffffff');
      this.saveButton.setBackgroundColor('#333333');
      if (!this.saveButton.input) {
        this.saveButton.setInteractive({ useHandCursor: true });
        this.saveButton.on('pointerover', () => {
          this.saveButton.setBackgroundColor('#555555');
        });
        this.saveButton.on('pointerout', () => {
          this.saveButton.setBackgroundColor('#333333');
        });
        this.saveButton.on('pointerdown', () => {
          this.scene.saveLevel();
        });
      }
    } else {
      this.saveButton.setColor('#666666');
      this.saveButton.setBackgroundColor('#222222');
      this.saveButton.disableInteractive();
    }
  }

  private handleClick(): void {
    const pointer = this.scene.input.activePointer;
    
    // Get world coordinates from GameScene camera
    const gameScene = this.scene.scene.get('game') as Phaser.Scene & { 
      getEntityManager: () => import('../ecs/EntityManager').EntityManager;
      cameras: { main: Phaser.Cameras.Scene2D.Camera };
    };
    
    const worldX = pointer.x + gameScene.cameras.main.scrollX;
    const worldY = pointer.y + gameScene.cameras.main.scrollY;

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
      if (distance < 64) { // Click radius
        this.scene.enterEditRobotMode(robot);
        return;
      }
    }
  }
}
