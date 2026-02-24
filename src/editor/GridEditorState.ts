import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { CellProperty } from '../systems/grid/Grid';

export class GridEditorState extends EditorState {
  private buttons: Phaser.GameObjects.Text[] = [];
  private readonly checkboxes: Map<CellProperty, { box: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text; checked: boolean }> = new Map();
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private isDragging: boolean = false;
  private selectedLayer: number = 0;
  private justEntered: boolean = true;

  onEnter(): void {
    this.justEntered = true;
    this.scene.time.delayedCall(100, () => {
      this.justEntered = false;
    });
    
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

    // Clear button
    const clearBtn = this.scene.add.text(
      layerStartX + 4 * layerSpacing,
      layerY,
      'Clear',
      {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#ff0000',
        padding: { x: 15, y: 8 }
      }
    );
    clearBtn.setOrigin(0.5);
    clearBtn.setScrollFactor(0);
    clearBtn.setDepth(1000);
    clearBtn.setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      this.selectedLayer = -1;
      this.buttons.slice(1, 5).forEach(b => b.setBackgroundColor('#333333'));
    });
    this.buttons.push(clearBtn);

    // Property radio buttons on right side
    const properties: CellProperty[] = ['platform', 'wall', 'stairs', 'path', 'water', 'blocked'];
    const startY = 100;
    const spacing = 40;

    properties.forEach((prop, index) => {
      const y = startY + index * spacing;
      const x = width - 150;

      const circle = this.scene.add.circle(x, y, 10, 0x333333);
      circle.setStrokeStyle(2, 0xffffff);
      circle.setScrollFactor(0);
      circle.setDepth(1000);
      circle.setInteractive({ useHandCursor: true });

      const label = this.scene.add.text(x + 30, y, prop, {
        fontSize: '18px',
        color: '#ffffff'
      });
      label.setOrigin(0, 0.5);
      label.setScrollFactor(0);
      label.setDepth(1000);

      circle.on('pointerdown', () => {
        // Deselect all
        this.checkboxes.forEach((data) => {
          data.checked = false;
          data.box.setFillStyle(0x333333);
        });
        
        // Select this one
        const data = this.checkboxes.get(prop);
        if (data) {
          data.checked = true;
          circle.setFillStyle(0x00ff00);
        }
      });

      this.checkboxes.set(prop, { box: circle, label, checked: false });
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
    if (this.justEntered) return;
    
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

    if (this.selectedLayer === -1) {
      this.scene.setCellData(cell.col, cell.row, { 
        layer: 0,
        properties: new Set(),
        backgroundTexture: ''
      });
      return;
    }

    const selectedProperty = Array.from(this.checkboxes.entries()).find(([_, data]) => data.checked)?.[0];
    const properties = selectedProperty ? new Set([selectedProperty]) : new Set<CellProperty>();
    
    console.log('[GridEditor] Painting cell', cell.col, cell.row, 'layer:', this.selectedLayer, 'property:', selectedProperty);

    this.scene.setCellData(cell.col, cell.row, { 
      layer: this.selectedLayer,
      properties 
    });
  }
}
