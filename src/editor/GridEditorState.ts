import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { CellProperty } from '../systems/grid/Grid';

export class GridEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private readonly checkboxes: Map<CellProperty, { box: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; checked: boolean }> = new Map();
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private isDragging: boolean = false;
  private selectedLayer: number = 0;

  onEnter(): void {
    const width = this.scene.cameras.main.width;

    // Selection graphics
    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setDepth(999);

    // Back button
    this.buttons.push(this.createBackButton());

    // Layer buttons at top
    const layerY = 20;
    const layerStartX = width / 2 - 250;
    const layerSpacing = 120;
    
    for (let layer = 0; layer <= 3; layer++) {
      const btn = this.scene.add.text(
        layerStartX + layer * layerSpacing,
        layerY,
        `Layer ${layer}`,
        {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: layer === 0 ? '#00ff00' : '#333333',
          padding: { x: 15, y: 8 }
        }
      );
      btn.setOrigin(0.5);
      btn.setScrollFactor(0);
      btn.setDepth(1000);
      btn.setInteractive({ useHandCursor: true });
      
      btn.on('pointerdown', () => {
        this.selectedLayer = layer;
        // Update button colors
        this.buttons.slice(1).forEach((b, i) => {
          b.setBackgroundColor(i === layer ? '#00ff00' : '#333333');
        });
      });
      
      this.buttons.push(btn);
    }

    // Tag checkboxes on right side
    const tags: CellProperty[] = ['platform', 'wall', 'stairs'];
    const startY = 100;
    const spacing = 40;

    tags.forEach((tag, index) => {
      const y = startY + index * spacing;
      const x = width - 150;

      const box = this.scene.add.rectangle(x, y, 20, 20, 0x333333);
      box.setStrokeStyle(2, 0xffffff);
      box.setScrollFactor(0);
      box.setDepth(1000);
      box.setInteractive({ useHandCursor: true });

      const label = this.scene.add.text(x + 30, y, tag, {
        fontSize: '18px',
        color: '#ffffff'
      });
      label.setOrigin(0, 0.5);
      label.setScrollFactor(0);
      label.setDepth(1000);

      box.on('pointerdown', () => {
        const checkbox = this.checkboxes.get(tag);
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          box.setFillStyle(checkbox.checked ? 0x00ff00 : 0x333333);
        }
      });

      this.checkboxes.set(tag, { box, label, checked: false });
    });

    // Mouse events for painting
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  onExit(): void {
    this.buttons.forEach(btn => btn.destroy());
    this.buttons = [];
    this.checkboxes.forEach(({ box, label }) => {
      box.destroy();
      label.destroy();
    });
    this.checkboxes.clear();
    this.selectionGraphics.destroy();

    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
  }

  onUpdate(_delta: number): void {
    // No per-frame updates needed
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y < 80 || pointer.y > this.scene.cameras.main.height - 80) return;
    if (pointer.x > this.scene.cameras.main.width - 200) return;

    this.isDragging = true;
    this.paintCell(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;
    this.paintCell(pointer);
  }

  private handlePointerUp(): void {
    this.isDragging = false;
  }

  private paintCell(pointer: Phaser.Input.Pointer): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const cell = grid.worldToCell(worldX, worldY);
    if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;

    const selectedTags = new Set<CellProperty>();
    this.checkboxes.forEach((checkbox, tag) => {
      if (checkbox.checked) {
        selectedTags.add(tag);
      }
    });

    this.scene.setCellData(cell.col, cell.row, { 
      layer: this.selectedLayer,
      properties: selectedTags 
    });
  }
}
