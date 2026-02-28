import { EditorState } from './EditorState';
import { DEPTH_EDITOR } from '../constants/DepthConstants';

export class AddEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];

  onEnter(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const centerX = width / 2;
    const startY = height * 0.25;

    const backButton = this.createBackButton();
    this.buttons.push(backButton);

    const robotButton = this.scene.add.text(centerX, startY, 'Robot', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    robotButton.setOrigin(0.5);
    robotButton.setScrollFactor(0);
    robotButton.setInteractive({ useHandCursor: true });
    robotButton.setDepth(DEPTH_EDITOR);
    this.buttons.push(robotButton);

    robotButton.on('pointerover', () => {
      robotButton.setBackgroundColor('#555555');
    });
    robotButton.on('pointerout', () => {
      robotButton.setBackgroundColor('#333333');
    });
    robotButton.on('pointerdown', () => {
      this.scene.enterAddRobotMode();
    });

    const bugBaseButton = this.scene.add.text(centerX, startY + 60, 'Bug Base', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    bugBaseButton.setOrigin(0.5);
    bugBaseButton.setScrollFactor(0);
    bugBaseButton.setInteractive({ useHandCursor: true });
    bugBaseButton.setDepth(DEPTH_EDITOR);
    this.buttons.push(bugBaseButton);

    bugBaseButton.on('pointerover', () => {
      bugBaseButton.setBackgroundColor('#555555');
    });
    bugBaseButton.on('pointerout', () => {
      bugBaseButton.setBackgroundColor('#333333');
    });
    bugBaseButton.on('pointerdown', () => {
      this.scene.enterAddBugBaseMode();
    });

    // Thrower button
    const throwerButton = this.scene.add.text(centerX, startY + 120, 'Thrower', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    throwerButton.setOrigin(0.5);
    throwerButton.setScrollFactor(0);
    throwerButton.setInteractive({ useHandCursor: true });
    throwerButton.setDepth(DEPTH_EDITOR);
    this.buttons.push(throwerButton);

    throwerButton.on('pointerover', () => {
      throwerButton.setBackgroundColor('#555555');
    });
    throwerButton.on('pointerout', () => {
      throwerButton.setBackgroundColor('#333333');
    });
    throwerButton.on('pointerdown', () => {
      this.scene.enterAddThrowerMode();
    });

    // Skeleton button
    const skeletonButton = this.scene.add.text(centerX, startY + 180, 'Skeleton', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    skeletonButton.setOrigin(0.5);
    skeletonButton.setScrollFactor(0);
    skeletonButton.setInteractive({ useHandCursor: true });
    skeletonButton.setDepth(DEPTH_EDITOR);
    this.buttons.push(skeletonButton);

    skeletonButton.on('pointerover', () => {
      skeletonButton.setBackgroundColor('#555555');
    });
    skeletonButton.on('pointerout', () => {
      skeletonButton.setBackgroundColor('#333333');
    });
    skeletonButton.on('pointerdown', () => {
      this.scene.enterAddSkeletonMode();
    });

    // BulletDude button
    const bulletDudeButton = this.scene.add.text(centerX, startY + 240, 'BulletDude', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    bulletDudeButton.setOrigin(0.5);
    bulletDudeButton.setScrollFactor(0);
    bulletDudeButton.setInteractive({ useHandCursor: true });
    bulletDudeButton.setDepth(DEPTH_EDITOR);
    this.buttons.push(bulletDudeButton);

    bulletDudeButton.on('pointerover', () => {
      bulletDudeButton.setBackgroundColor('#555555');
    });
    bulletDudeButton.on('pointerout', () => {
      bulletDudeButton.setBackgroundColor('#333333');
    });
    bulletDudeButton.on('pointerdown', () => {
      this.scene.enterAddBulletDudeMode();
    });
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
  }

}
