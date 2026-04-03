import type { EditorBridge } from './EditorBridge';
import { TransformComponent } from '../src/ecs/components/core/TransformComponent';
import { SpriteComponent } from '../src/ecs/components/core/SpriteComponent';
import { Depth } from '../src/constants/DepthConstants';

const CAMERA_SPEED_PX_PER_SEC = 400;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

export class CanvasInteraction {
  private isMouseOverCanvas = false;
  private readonly keysDown = new Set<string>();
  private isDragging = false;
  private lastPaintedCell: string | null = null;
  private readonly hoverCoords: HTMLElement;

  // Editor overlays
  private labels: Phaser.GameObjects.Text[] = [];
  private highlights: Phaser.GameObjects.Rectangle[] = [];

  constructor(private readonly bridge: EditorBridge, canvasContainer: HTMLElement) {
    canvasContainer.addEventListener('mouseenter', () => { this.isMouseOverCanvas = true; });
    canvasContainer.addEventListener('mouseleave', () => { this.isMouseOverCanvas = false; });

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.bridge.isLoading) return;
      const camera = this.bridge.getScene().cameras.main;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      camera.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom + delta)));
    }, { passive: false });

    window.addEventListener('blur', () => {
      if (this.isDragging) {
        this.bridge.endDragMutation();
        this.isDragging = false;
        this.lastPaintedCell = null;
      }
    });

    this.hoverCoords = document.createElement('div');
    this.hoverCoords.id = 'hover-coords';
    this.hoverCoords.style.display = 'none';
    canvasContainer.appendChild(this.hoverCoords);
  }

  registerPhaserListeners(): void {
    const scene = this.bridge.getScene();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    scene.input.on('pointerup', () => this.onPointerUp());

    // Register camera update
    scene.events.on('update', (_time: number, delta: number) => this.updateCamera(delta));

    // Render editor overlays
    this.renderOverlays();
  }

  private isHtmlInputFocused(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void this.bridge.saveLevel();
      return;
    }
    if (!this.isMouseOverCanvas || this.isHtmlInputFocused()) return;
    if (this.bridge.isLoading) return;

    this.keysDown.add(e.key.toLowerCase());
    switch (e.key.toLowerCase()) {
      case 'g': {
        const grid = this.bridge.getGrid();
        grid.setGridDebugEnabled(!grid.gridDebugEnabled);
        break;
      }
      case 'delete': case 'backspace': this.bridge.deleteSelected(); break;
      case 'escape': this.bridge.clearSelection(); break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key.toLowerCase());
  }

  private updateCamera(delta: number): void {
    if (!this.isMouseOverCanvas || this.isHtmlInputFocused()) return;
    if (this.bridge.isLoading) return;
    const speed = CAMERA_SPEED_PX_PER_SEC * (delta / 1000);
    const camera = this.bridge.getScene().cameras.main;
    if (this.keysDown.has('a') || this.keysDown.has('arrowleft')) camera.scrollX -= speed;
    if (this.keysDown.has('d') || this.keysDown.has('arrowright')) camera.scrollX += speed;
    if (this.keysDown.has('w') || this.keysDown.has('arrowup')) camera.scrollY -= speed;
    if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) camera.scrollY += speed;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.bridge.isLoading) return;
    // Safety reset for orphaned drags
    if (this.isDragging) {
      this.bridge.endDragMutation();
      this.isDragging = false;
      this.lastPaintedCell = null;
    }

    const grid = this.bridge.getGrid();
    const cell = grid.worldToCell(p.worldX, p.worldY);
    const tool = this.bridge.currentTool;

    if (tool === 'select') {
      this.handleSelect(p, grid, cell);
    } else if (tool === 'move') {
      this.handleMove(cell);
    } else if (tool === 'entity') {
      this.handleEntityPlace(cell);
    } else if (tool === 'texture') {
      this.bridge.beginDragMutation();
      this.isDragging = true;
      this.lastPaintedCell = `${cell.col},${cell.row}`;
      if (this.bridge.selectedTexture) {
        this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
      }
    } else {
      // Grid tools (wall, floor, water, etc.)
      this.bridge.beginDragMutation();
      this.isDragging = true;
      this.lastPaintedCell = `${cell.col},${cell.row}`;
      this.bridge.paintCell(cell.col, cell.row);
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.bridge.isLoading) return;
    const grid = this.bridge.getGrid();
    const cell = grid.worldToCell(p.worldX, p.worldY);

    // Update hover coords
    if (cell.col >= 0 && cell.col < grid.width && cell.row >= 0 && cell.row < grid.height) {
      this.hoverCoords.textContent = `${cell.col}, ${cell.row}`;
      this.hoverCoords.style.display = '';
    } else {
      this.hoverCoords.style.display = 'none';
    }

    if (!this.isDragging) return;
    const key = `${cell.col},${cell.row}`;
    if (key === this.lastPaintedCell) return;
    this.lastPaintedCell = key;

    if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;

    if (this.bridge.currentTool === 'texture' && this.bridge.selectedTexture) {
      this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
    } else if (this.bridge.currentTool !== 'select' && this.bridge.currentTool !== 'move' && this.bridge.currentTool !== 'entity') {
      this.bridge.paintCell(cell.col, cell.row);
    }
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      this.bridge.endDragMutation();
      this.isDragging = false;
      this.lastPaintedCell = null;
    }
  }

  private handleSelect(p: Phaser.Input.Pointer, grid: import('../src/systems/grid/Grid').Grid, cell: { col: number; row: number }): void {
    // Check entity hit
    const entityManager = this.bridge.getEntityManager();
    let hitEntity: import('../src/ecs/Entity').Entity | null = null;
    let closestDist = Infinity;

    for (const entity of entityManager.getAll()) {
      if (entity.id === 'player') continue;
      const sprite = entity.get(SpriteComponent);
      if (!sprite) continue;
      const bounds = sprite.sprite.getBounds();
      if (bounds.contains(p.worldX, p.worldY)) {
        const dist = Math.hypot(p.worldX - sprite.sprite.x, p.worldY - sprite.sprite.y);
        if (dist < closestDist) {
          closestDist = dist;
          hitEntity = entity;
        }
      }
    }

    if (hitEntity) {
      this.bridge.selectEntity(hitEntity);
    } else if (cell.col >= 0 && cell.col < grid.width && cell.row >= 0 && cell.row < grid.height) {
      this.bridge.selectCell(cell.col, cell.row);
    } else {
      this.bridge.clearSelection();
    }
    this.renderOverlays();
  }

  private handleMove(cell: { col: number; row: number }): void {
    if (this.bridge.selectedEntity) {
      this.bridge.moveEntity(this.bridge.selectedEntity.id, cell.col, cell.row);
      this.renderOverlays();
    }
  }

  private handleEntityPlace(cell: { col: number; row: number }): void {
    if (this.bridge.selectedEntityType) {
      this.bridge.addEntity(this.bridge.selectedEntityType, cell.col, cell.row);
      this.renderOverlays();
    }
  }

  // --- Editor overlays ---
  renderOverlays(): void {
    // Clean up old overlays
    for (const l of this.labels) l.destroy();
    for (const h of this.highlights) h.destroy();
    this.labels = [];
    this.highlights = [];

    const scene = this.bridge.getScene();
    const grid = this.bridge.getGrid();
    const entityManager = this.bridge.getEntityManager();
    const levelData = scene.getLevelData();
    const cellSize = grid.cellSize;

    // Entity labels
    const labelMap: Record<string, string> = {
      skeleton: 'S', thrower: 'T', stalking_robot: 'R', bug_base: 'BB',
      bullet_dude: 'BD', puma: 'P', npc: 'NPC', breakable: 'BK',
    };
    for (const entity of entityManager.getAll()) {
      if (entity.id === 'player') continue;
      const transform = entity.get(TransformComponent);
      if (!transform) continue;
      const prefix = entity.id.replace(/\d+$/, '');
      const labelText = labelMap[prefix] ?? prefix.substring(0, 2).toUpperCase();
      const label = scene.add.text(transform.x, transform.y - cellSize / 2 - 10, labelText, {
        fontSize: '10px', color: '#ffffff', backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 }
      });
      label.setOrigin(0.5);
      label.setDepth(Depth.debugText);
      this.labels.push(label);
    }

    // Data-only entity labels (triggers, exits, etc.)
    for (const e of levelData.entities ?? []) {
      if (e.type === 'trigger') {
        const cells = (e.data.triggerCells as Array<{col: number; row: number}>) ?? [];
        for (const c of cells) {
          const rect = scene.add.rectangle(
            c.col * cellSize + cellSize / 2, c.row * cellSize + cellSize / 2,
            cellSize, cellSize, 0xffff00, 0.2
          );
          rect.setDepth(Depth.debugText - 1);
          this.highlights.push(rect);
        }
        if (cells.length > 0) {
          const label = scene.add.text(cells[0].col * cellSize + cellSize / 2, cells[0].row * cellSize - 10, `TR:${e.id}`, {
            fontSize: '9px', color: '#ffff00', backgroundColor: '#000000aa', padding: { x: 2, y: 1 }
          });
          label.setOrigin(0.5);
          label.setDepth(Depth.debugText);
          this.labels.push(label);
        }
      }
      if (e.type === 'exit') {
        const cells = (e.data.triggerCells as Array<{col: number; row: number}>) ?? [];
        for (const c of cells) {
          const rect = scene.add.rectangle(
            c.col * cellSize + cellSize / 2, c.row * cellSize + cellSize / 2,
            cellSize, cellSize, 0x00ffff, 0.2
          );
          rect.setDepth(Depth.debugText - 1);
          this.highlights.push(rect);
        }
      }
    }

    // Selected cell highlight
    if (this.bridge.selectedCell) {
      const { col, row } = this.bridge.selectedCell;
      const rect = scene.add.rectangle(
        col * cellSize + cellSize / 2, row * cellSize + cellSize / 2,
        cellSize, cellSize, 0x00ff00, 0.3
      );
      rect.setStrokeStyle(2, 0x00ff00);
      rect.setDepth(Depth.debugText);
      this.highlights.push(rect);
    }

    // Selected entity highlight
    if (this.bridge.selectedEntity) {
      const transform = this.bridge.selectedEntity.get(TransformComponent);
      if (transform) {
        const rect = scene.add.rectangle(transform.x, transform.y, cellSize, cellSize, 0x00ff00, 0.3);
        rect.setStrokeStyle(2, 0x00ff00);
        rect.setDepth(Depth.debugText);
        this.highlights.push(rect);
      }
    }
  }
}
