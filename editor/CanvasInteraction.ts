import type { EditorBridge } from './EditorBridge';
import { TransformComponent } from '../src/ecs/components/core/TransformComponent';
import { Depth } from '../src/constants/DepthConstants';
import { ensureClockwise, isPointInPolygon } from '../src/math/PolygonUtils';

const CAMERA_SPEED_PX_PER_SEC = 400;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.05;
const SNAP_DISTANCE_PX = 16;

export class CanvasInteraction {
  private isMouseOverCanvas = false;
  private readonly keysDown = new Set<string>();
  private isDragging = false;
  private lastPaintedCell: string | null = null;
  private dragEntityId: string | null = null;
  private dragTextureFrom: { col: number; row: number; textureIndex: number } | null = null;
  private ctrlDragWorldPos: { x: number; y: number } | null = null;
  private lastClickCell: string | null = null;
  private clickCycleIndex = 0;
  private readonly hoverCoords: HTMLElement;

  // Blocked area drawing state
  private drawingVertices: Array<{ x: number; y: number }> = [];
  private drawingAutoLayer = 0;
  private cursorWorldPos: { x: number; y: number } | null = null;

  // Editor overlays
  private labels: Phaser.GameObjects.Text[] = [];
  private highlights: Phaser.GameObjects.Rectangle[] = [];
  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor(private readonly bridge: EditorBridge, canvasContainer: HTMLElement) {
    bridge.cancelDrawing = () => this.cancelDrawing();
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
        this.dragEntityId = null;
        this.dragTextureFrom = null;
      }
    });

    this.hoverCoords = document.createElement('div');
    this.hoverCoords.id = 'hover-coords';
    this.hoverCoords.style.display = 'none';
    canvasContainer.appendChild(this.hoverCoords);
  }

  registerPhaserListeners(): void {
    const scene = this.bridge.getScene();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) {
        this.onRightClick();
      } else {
        this.onPointerDown(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    scene.input.on('pointerup', () => this.onPointerUp());

    // Disable context menu on canvas
    scene.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (this.bridge.copySelected()) e.preventDefault();
      return;
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      const sel = this.bridge.selectedCell;
      if (sel) {
        e.preventDefault();
        if (this.bridge.clipboardEntity) {
          this.bridge.pasteEntity(sel.col, sel.row);
        } else {
          this.bridge.pasteToCell(sel.col, sel.row);
          this.renderOverlays();
        }
      }
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
      case 'delete': case 'backspace':
        if (this.bridge.selectedBlockedAreaId) {
          this.bridge.removeBlockedArea(this.bridge.selectedBlockedAreaId);
          this.renderOverlays();
        } else {
          this.bridge.deleteSelected();
        }
        break;
      case 'escape':
        if (this.drawingVertices.length > 0) {
          this.drawingVertices = [];
          this.bridge.onDrawingStateChanged?.(false);
          this.renderOverlays();
        } else {
          this.bridge.clearSelection();
        }
        break;
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
      this.dragEntityId = null;
      this.dragTextureFrom = null;
      this.ctrlDragWorldPos = null;
    }

    const grid = this.bridge.getGrid();
    const cell = grid.worldToCell(p.worldX, p.worldY);
    const tool = this.bridge.currentTool;

    // Trigger cell editing mode — toggle cells for the active entity
    if (this.bridge.editingTriggerCells) {
      if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;
      const levelData = this.bridge.getScene().getLevelData();
      const entityDef = levelData.entities?.find(e => e.id === this.bridge.editingTriggerCells);
      if (!entityDef) return;
      const cells = (entityDef.data.triggerCells as Array<{col: number; row: number}>) ?? [];
      const idx = cells.findIndex(c => c.col === cell.col && c.row === cell.row);
      if (idx >= 0) cells.splice(idx, 1);
      else cells.push({ col: cell.col, row: cell.row });
      entityDef.data.triggerCells = cells;
      this.bridge.isDirty = true;
      this.bridge.onDirtyStateChanged?.(true);
      this.renderOverlays();
      return;
    }

    if (tool === 'select' || tool === 'level' || tool === 'state') {
      if (tool !== 'select') this.bridge.setTool('select');
      this.handleSelect(p, grid, cell);
    } else if (tool === 'entity') {
      this.handleEntityPlace(cell);
    } else if (tool === 'texture') {
      this.bridge.beginDragMutation();
      this.isDragging = true;
      this.lastPaintedCell = `${cell.col},${cell.row}`;
      if (this.bridge.selectedTexture) {
        this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
      }
    } else if (tool === 'blockedarea') {
      this.handleBlockedAreaClick(p);
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

    this.cursorWorldPos = { x: p.worldX, y: p.worldY };
    if (this.drawingVertices.length > 0) {
      this.renderOverlays();
    }

    if (!this.isDragging) return;
    const key = `${cell.col},${cell.row}`;

    // Ctrl+texture drag needs per-pixel updates, skip the cell-change gate
    if (this.dragTextureFrom && p.event instanceof MouseEvent && (p.event.ctrlKey || p.event.metaKey)) {
      this.ctrlDragWorldPos = { x: p.worldX, y: p.worldY };
      this.bridge.moveCellTexturePixel(this.dragTextureFrom.col, this.dragTextureFrom.row, this.dragTextureFrom.textureIndex, p.worldX, p.worldY);
      this.renderOverlays();
      return;
    }

    if (key === this.lastPaintedCell) return;
    this.lastPaintedCell = key;

    if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) return;

    if (this.dragEntityId) {
      this.bridge.moveEntity(this.dragEntityId, cell.col, cell.row);
      this.renderOverlays();
    } else if (this.dragTextureFrom) {
      this.ctrlDragWorldPos = null;
      this.bridge.moveSingleTexture(this.dragTextureFrom.col, this.dragTextureFrom.row, this.dragTextureFrom.textureIndex, cell.col, cell.row);
      this.dragTextureFrom = { col: cell.col, row: cell.row, textureIndex: 0 };
      this.bridge.selectedCell = { col: cell.col, row: cell.row };
      this.bridge.selectedTextureIndex = 0;
      this.renderOverlays();
    } else if (this.bridge.currentTool === 'texture' && this.bridge.selectedTexture) {
      this.bridge.setCellTexture(cell.col, cell.row, this.bridge.selectedTexture);
    } else if (this.bridge.currentTool !== 'select' && this.bridge.currentTool !== 'entity') {
      this.bridge.paintCell(cell.col, cell.row);
    }
  }

  private onPointerUp(): void {
    if (this.ctrlDragWorldPos && this.dragTextureFrom) {
      this.bridge.finalizeCellTexturePixelDrop(this.dragTextureFrom.col, this.dragTextureFrom.row, this.dragTextureFrom.textureIndex, this.ctrlDragWorldPos.x, this.ctrlDragWorldPos.y);
    }
    this.dragEntityId = null;
    this.dragTextureFrom = null;
    this.ctrlDragWorldPos = null;
    if (this.isDragging) {
      this.bridge.endDragMutation();
      this.isDragging = false;
      this.lastPaintedCell = null;
    }
  }

  private handleSelect(p: Phaser.Input.Pointer, grid: import('../src/systems/grid/Grid').Grid, cell: { col: number; row: number }): void {
    if (cell.col < 0 || cell.col >= grid.width || cell.row < 0 || cell.row >= grid.height) {
      this.bridge.clearSelection();
      this.lastClickCell = null;
      this.renderOverlays();
      return;
    }

    // Collect all selectable items at this cell
    const cellKey = `${cell.col},${cell.row}`;
    const halfCell = grid.cellSize / 2;
    type Candidate = { kind: 'entity'; entity: import('../src/ecs/Entity').Entity } | { kind: 'data'; id: string } | { kind: 'blockedarea'; id: string } | { kind: 'cell' };
    const candidates: Candidate[] = [];

    // ECS entities at this cell
    for (const entity of this.bridge.getEntityManager().getAll()) {
      if (entity.id === 'player') continue;
      const transform = entity.get(TransformComponent);
      if (!transform) continue;
      if (Math.abs(p.worldX - transform.x) <= halfCell && Math.abs(p.worldY - transform.y) <= halfCell) {
        candidates.push({ kind: 'entity', entity });
      }
    }

    // Data-only entities (triggers/exits) with triggerCells at this cell
    const levelData = this.bridge.getScene().getLevelData();
    for (const e of levelData.entities ?? []) {
      if (e.type !== 'trigger' && e.type !== 'exit') continue;
      const cells = (e.data.triggerCells as Array<{col: number; row: number}>) ?? [];
      if (cells.some(c => c.col === cell.col && c.row === cell.row)) {
        // Skip if already added as ECS entity
        if (!candidates.some(c => c.kind === 'entity' && (c.entity.id === e.id || c.entity.id === `${e.id}_trigger`))) {
          candidates.push({ kind: 'data', id: e.id });
        }
      }
    }

    // Blocked areas containing click point
    for (const area of levelData.blockedAreas ?? []) {
      if (isPointInPolygon(p.worldX, p.worldY, area.vertices)) {
        candidates.push({ kind: 'blockedarea', id: area.id });
      }
    }

    // Always add the cell itself as last option
    candidates.push({ kind: 'cell' });

    // Cycle on repeated clicks at same cell
    if (cellKey === this.lastClickCell) {
      this.clickCycleIndex = (this.clickCycleIndex + 1) % candidates.length;
    } else {
      this.clickCycleIndex = 0;
      this.lastClickCell = cellKey;
    }

    const pick = candidates[this.clickCycleIndex];
    if (pick.kind === 'entity') {
      this.bridge.selectEntity(pick.entity);
      this.dragEntityId = pick.entity.id;
      this.isDragging = true;
      this.lastPaintedCell = cellKey;
    } else if (pick.kind === 'data') {
      this.bridge.selectDataEntity(pick.id);
    } else if (pick.kind === 'blockedarea') {
      this.bridge.selectBlockedArea(pick.id);
    } else {
      this.bridge.selectCell(cell.col, cell.row);
      const gridCell = grid.getCell(cell.col, cell.row);
      const levelCell = levelData.cells.find(c => c.col === cell.col && c.row === cell.row);
      if (gridCell?.backgroundTexture || levelCell?.animatedTexture) {
        const texIndex = this.bridge.findClosestTextureIndex(cell.col, cell.row, p.worldX, p.worldY);
        this.dragTextureFrom = { col: cell.col, row: cell.row, textureIndex: texIndex };
        this.bridge.selectedTextureIndex = texIndex;
        this.isDragging = true;
        this.lastPaintedCell = cellKey;
      }
    }
    this.renderOverlays();
  }

  private handleEntityPlace(cell: { col: number; row: number }): void {
    if (this.bridge.selectedEntityType) {
      this.bridge.addEntity(this.bridge.selectedEntityType, cell.col, cell.row);
      this.renderOverlays();
    }
  }

  private onRightClick(): void {
    if (this.drawingVertices.length > 0) {
      this.drawingVertices.pop();
      this.renderOverlays();
    }
  }

  private handleBlockedAreaClick(p: Phaser.Input.Pointer): void {
    const wx = p.worldX;
    const wy = p.worldY;

    // If drawing, check for close or add vertex
    if (this.drawingVertices.length > 0) {
      const first = this.drawingVertices[0];
      const dist = Math.hypot(wx - first.x, wy - first.y);
      if (dist <= SNAP_DISTANCE_PX && this.drawingVertices.length >= 3) {
        this.closePolygon();
        return;
      }
      this.drawingVertices.push({ x: wx, y: wy });
      this.renderOverlays();
      return;
    }

    // Not drawing — check if clicking an existing blocked area for selection
    const levelData = this.bridge.getScene().getLevelData();
    const areas = levelData.blockedAreas ?? [];
    const hits = areas.filter(a => isPointInPolygon(wx, wy, a.vertices));
    if (hits.length > 0) {
      const cellKey = `${Math.floor(wx)},${Math.floor(wy)}`;
      if (this.lastClickCell === cellKey) {
        this.clickCycleIndex = (this.clickCycleIndex + 1) % hits.length;
      } else {
        this.clickCycleIndex = 0;
        this.lastClickCell = cellKey;
      }
      this.bridge.selectBlockedArea(hits[this.clickCycleIndex].id);
      this.renderOverlays();
      return;
    }

    // Start new drawing
    const grid = this.bridge.getGrid();
    const cell = grid.worldToCell(wx, wy);
    const gridCell = grid.getCell(cell.col, cell.row);
    this.drawingAutoLayer = gridCell?.layer ?? 0;
    this.drawingVertices = [{ x: wx, y: wy }];
    this.bridge.selectBlockedArea(null);
    this.bridge.onDrawingStateChanged?.(true);
    this.renderOverlays();
  }

  private closePolygon(): void {
    const verts = ensureClockwise([...this.drawingVertices]);
    this.drawingVertices = [];
    this.bridge.onDrawingStateChanged?.(false);

    const id = this.bridge.addBlockedArea(verts, this.drawingAutoLayer);
    this.bridge.selectBlockedArea(id);
    this.renderOverlays();
  }

  cancelDrawing(): void {
    this.drawingVertices = [];
    this.bridge.onDrawingStateChanged?.(false);
    this.renderOverlays();
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
      skeleton: 'S', red_skeleton: 'RS', thrower: 'T', stalking_robot: 'R', bug_base: 'BB',
      bullet_dude: 'BD', puma: 'P', npc: 'NPC', breakable: 'BK', pushable: 'PU', hole: 'HO', collectible: 'CO', lever: 'LV', laser: 'LA', escort: 'ES',
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
    const editingId = this.bridge.editingTriggerCells;
    for (const e of levelData.entities ?? []) {
      if (e.type === 'trigger' || e.type === 'exit') {
        const cells = (e.data.triggerCells as Array<{col: number; row: number}>) ?? [];
        const isEditing = e.id === editingId;
        const color = e.type === 'trigger' ? 0xffff00 : 0x00ffff;
        for (const c of cells) {
          const rect = scene.add.rectangle(
            c.col * cellSize + cellSize / 2, c.row * cellSize + cellSize / 2,
            cellSize, cellSize, color, isEditing ? 0.5 : 0.2
          );
          if (isEditing) rect.setStrokeStyle(2, 0xff00ff);
          rect.setDepth(Depth.debugText - 1);
          this.highlights.push(rect);
        }
        if (e.type === 'trigger' && cells.length > 0) {
          const label = scene.add.text(cells[0].col * cellSize + cellSize / 2, cells[0].row * cellSize - 10, `TR:${e.id}`, {
            fontSize: '9px', color: '#ffff00', backgroundColor: '#000000aa', padding: { x: 2, y: 1 }
          });
          label.setOrigin(0.5);
          label.setDepth(Depth.debugText);
          this.labels.push(label);
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

    // Blocked area rendering
    if (this.graphics) this.graphics.destroy();
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(Depth.debugText);

    const layerColors = [0xff4444, 0x4488ff, 0x44ff44];
    for (const area of levelData.blockedAreas ?? []) {
      const verts = area.vertices;
      if (verts.length < 3) continue;
      const color = layerColors[area.layer] ?? 0xffff00;
      const isSelected = area.id === this.bridge.selectedBlockedAreaId;

      this.graphics.fillStyle(color, isSelected ? 0.3 : 0.15);
      this.graphics.beginPath();
      this.graphics.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) this.graphics.lineTo(verts[i].x, verts[i].y);
      this.graphics.closePath();
      this.graphics.fillPath();

      this.graphics.lineStyle(isSelected ? 3 : 2, color, isSelected ? 1 : 0.6);
      this.graphics.beginPath();
      this.graphics.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) this.graphics.lineTo(verts[i].x, verts[i].y);
      this.graphics.closePath();
      this.graphics.strokePath();
    }

    // Drawing preview
    if (this.drawingVertices.length > 0) {
      const dv = this.drawingVertices;
      // Vertex dots
      this.graphics.fillStyle(0xffffff, 1);
      for (const v of dv) this.graphics.fillCircle(v.x, v.y, 4);

      // Lines between vertices
      if (dv.length >= 2) {
        this.graphics.lineStyle(2, 0xffffff, 0.8);
        this.graphics.beginPath();
        this.graphics.moveTo(dv[0].x, dv[0].y);
        for (let i = 1; i < dv.length; i++) this.graphics.lineTo(dv[i].x, dv[i].y);
        this.graphics.strokePath();
      }

      // Preview line to cursor
      if (this.cursorWorldPos) {
        const last = dv[dv.length - 1];
        this.graphics.lineStyle(1, 0xffffff, 0.4);
        this.graphics.beginPath();
        this.graphics.moveTo(last.x, last.y);
        this.graphics.lineTo(this.cursorWorldPos.x, this.cursorWorldPos.y);
        this.graphics.strokePath();

        // Snap indicator near first vertex
        if (dv.length >= 3) {
          const dist = Math.hypot(this.cursorWorldPos.x - dv[0].x, this.cursorWorldPos.y - dv[0].y);
          if (dist <= SNAP_DISTANCE_PX) {
            this.graphics.lineStyle(2, 0x00ff00, 0.8);
            this.graphics.strokeCircle(dv[0].x, dv[0].y, 8);
          }
        }
      }
    }
  }
}
