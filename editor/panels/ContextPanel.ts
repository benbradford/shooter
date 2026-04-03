import type { EditorBridge } from '../EditorBridge';
import type { Entity } from '../../src/ecs/Entity';
import { TexturePicker } from './TexturePicker';

export class ContextPanel {
  private readonly texturePicker: TexturePicker;

  constructor(private readonly bridge: EditorBridge, private readonly container: HTMLElement) {
    this.texturePicker = new TexturePicker(bridge);
    this.showLevelInfo();
  }

  showLevelInfo(): void {
    const scene = this.bridge.getScene?.();
    if (!scene) { this.container.innerHTML = '<p>Loading...</p>'; return; }
    const grid = this.bridge.getGrid();
    const levelData = scene.getLevelData();
    const entityCount = (levelData.entities ?? []).length;
    this.container.innerHTML = `
      <div class="section-header">Level Info</div>
      <div class="level-info-grid">
        <span class="label">Name</span><span>${this.bridge.currentLevelName ?? '—'}</span>
        <span class="label">Size</span><span>${grid.width} x ${grid.height}</span>
        <span class="label">Theme</span><span>${levelData.levelTheme ?? 'dungeon'}</span>
        <span class="label">Entities</span><span>${entityCount}</span>
        <span class="label">Player</span><span>${levelData.playerStart.x}, ${levelData.playerStart.y}</span>
      </div>
      <div class="section-header" style="margin-top:12px">Resize</div>
      <div class="toolbar-row">
        <button class="ed-btn" id="ri-add-col">+ Col</button>
        <button class="ed-btn" id="ri-add-row">+ Row</button>
        <button class="ed-btn danger" id="ri-rem-col">- Col</button>
        <button class="ed-btn danger" id="ri-rem-row">- Row</button>
      </div>
    `;
    this.container.querySelector('#ri-add-col')?.addEventListener('click', () => {
      this.bridge.resizeGrid(grid.width + 1, grid.height);
      this.showLevelInfo();
    });
    this.container.querySelector('#ri-add-row')?.addEventListener('click', () => {
      this.bridge.resizeGrid(grid.width, grid.height + 1);
      this.showLevelInfo();
    });
    this.container.querySelector('#ri-rem-col')?.addEventListener('click', () => {
      if (grid.width <= 10) return;
      this.bridge.resizeGrid(grid.width - 1, grid.height);
      this.showLevelInfo();
    });
    this.container.querySelector('#ri-rem-row')?.addEventListener('click', () => {
      if (grid.height <= 10) return;
      this.bridge.resizeGrid(grid.width, grid.height - 1);
      this.showLevelInfo();
    });
  }

  showCellForm(col: number, row: number): void {
    const grid = this.bridge.getGrid();
    const cell = grid.getCell(col, row);
    if (!cell) return;
    const layer = grid.getLayer(cell);
    const props = Array.from(cell.properties);
    const allProps = ['wall', 'platform', 'stairs', 'water', 'bridge', 'blocked', 'path'];

    this.container.innerHTML = `
      <div class="section-header">Cell (${col}, ${row})</div>
      <div class="form-group">
        <label>Layer</label>
        <input type="number" id="cf-layer" value="${layer}" min="-1" max="5" />
      </div>
      <div class="form-group">
        <label>Properties</label>
        ${allProps.map(p => `<label style="display:block"><input type="checkbox" data-prop="${p}" ${props.includes(p as import('../../src/systems/grid/Grid').CellProperty) ? 'checked' : ''} /> ${p}</label>`).join('')}
      </div>
      <div class="form-group">
        <label>Texture</label>
        <div style="display:flex;gap:4px;align-items:center">
          <span id="cf-tex-label" style="flex:1;font-size:11px;color:#95a5a6">${cell.backgroundTexture || '(none)'}</span>
          <button class="ed-btn" id="cf-choose-tex">Choose</button>
          <button class="ed-btn danger" id="cf-clear-tex">✕</button>
        </div>
      </div>
      <button class="ed-btn danger" id="cf-clear">Clear Cell</button>
    `;

    // Prevent WASD in inputs
    for (const input of this.container.querySelectorAll('input')) {
      input.addEventListener('keydown', e => e.stopPropagation());
    }

    this.container.querySelector('#cf-layer')?.addEventListener('change', (e) => {
      this.bridge.setCellLayer(col, row, Number.parseInt((e.target as HTMLInputElement).value));
    });
    for (const cb of this.container.querySelectorAll<HTMLInputElement>('input[data-prop]')) {
      cb.addEventListener('change', () => {
        const prop = cb.dataset.prop as import('../../src/systems/grid/Grid').CellProperty;
        const currentCell = grid.getCell(col, row);
        if (!currentCell) return;
        const newProps = new Set(currentCell.properties);
        if (cb.checked) newProps.add(prop); else newProps.delete(prop);
        const newLayer = (newProps.has('wall') || newProps.has('platform') || newProps.has('stairs')) ? 1 : 0;
        this.bridge.setCellLayer(col, row, newLayer);
        // Apply properties directly
        grid.setCell(col, row, { properties: newProps });
        grid.render();
        this.bridge.getScene().renderGrid(grid);
      });
    }
    this.container.querySelector('#cf-choose-tex')?.addEventListener('click', () => {
      this.texturePicker.open((key) => {
        this.bridge.setCellTexture(col, row, key);
        this.showCellForm(col, row);
      });
    });
    this.container.querySelector('#cf-clear-tex')?.addEventListener('click', () => {
      this.bridge.clearCellTexture(col, row);
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-clear')?.addEventListener('click', () => {
      this.bridge.clearCell(col, row);
      this.showCellForm(col, row);
    });
  }

  showEntityForm(entity: Entity): void {
    const levelData = this.bridge.getScene().getLevelData();
    const entityDef = levelData.entities?.find(e => e.id === entity.id);
    if (!entityDef) {
      this.container.innerHTML = `<div class="section-header">Entity: ${entity.id}</div><p>No level data found</p>`;
      return;
    }

    const data = entityDef.data;
    let typeFields = '';

    // Difficulty field for enemies
    if (['skeleton', 'thrower', 'bug_base', 'bullet_dude', 'puma', 'stalking_robot'].includes(entityDef.type)) {
      typeFields += `<div class="form-group"><label>Difficulty</label>
        <select id="ef-diff">${['easy', 'medium', 'hard'].map(d => `<option ${data.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>`;
    }
    if (entityDef.type === 'puma') {
      typeFields += `<div class="form-group"><label>Start Direction (1-8)</label>
        <input type="number" id="ef-dir" value="${data.startDirection ?? 4}" min="1" max="8" /></div>`;
    }
    if (entityDef.type === 'stalking_robot') {
      const wps = (data.waypoints as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Waypoints (${wps.length})</label>
        <div id="ef-wps">${wps.map((w, i) => `<span style="font-size:11px">${i}: (${w.col},${w.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-add-wp" style="margin-top:4px">Add Waypoint (click canvas)</button></div>`;
    }
    if (entityDef.type === 'trigger') {
      const cells = (data.triggerCells as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Event to Raise</label>
        <input id="ef-event" value="${data.eventToRaise ?? ''}" /></div>
        <div class="form-group"><label><input type="checkbox" id="ef-oneshot" ${data.oneShot ? 'checked' : ''} /> One Shot</label></div>
        <div class="form-group"><label>Trigger Cells (${cells.length})</label>
        <div id="ef-tcells">${cells.map((c, i) => `<span style="font-size:11px">${i}: (${c.col},${c.row}) </span>`).join('')}</div></div>`;
    }
    if (entityDef.type === 'exit') {
      typeFields += `<div class="form-group"><label>Target Level</label><input id="ef-target" value="${data.targetLevel ?? ''}" /></div>
        <div class="form-group"><label>Target Col</label><input type="number" id="ef-tcol" value="${data.targetCol ?? 0}" /></div>
        <div class="form-group"><label>Target Row</label><input type="number" id="ef-trow" value="${data.targetRow ?? 0}" /></div>`;
    }
    if (entityDef.type === 'eventchainer') {
      const events = (data.eventsToRaise as Array<{event: string; delayMs: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Events to Raise</label>
        <textarea id="ef-events" rows="4">${JSON.stringify(events, null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'cellmodifier') {
      typeFields += `<div class="form-group"><label>Cells to Modify</label>
        <textarea id="ef-cellmod" rows="4">${JSON.stringify(data.cellsToModify ?? [], null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'npc') {
      typeFields += `<div class="form-group"><label>Assets</label><input id="ef-assets" value="${data.assets ?? 'npc1'}" /></div>
        <div class="form-group"><label>Direction</label>
        <select id="ef-npcdir">${['Down', 'Up', 'Left', 'Right', 'DownLeft', 'DownRight', 'UpLeft', 'UpRight'].map(d => `<option ${data.direction === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="form-group"><label>Name</label><input id="ef-npcname" value="${data.name ?? ''}" /></div>
        <div class="form-group"><label>Interactions (JSON)</label>
        <textarea id="ef-interactions" rows="6">${JSON.stringify(data.interactions ?? [], null, 2)}</textarea></div>`;
    }
    if (entityDef.type === 'breakable') {
      typeFields += `<div class="form-group"><label>Texture</label><input id="ef-btex" value="${data.texture ?? ''}" /></div>
        <div class="form-group"><label>Health</label><input type="number" id="ef-bhealth" value="${data.health ?? 1}" /></div>
        <div class="form-group"><label>Rarity</label>
        <select id="ef-brarity">${['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => `<option ${data.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
    }
    if (entityDef.type === 'interaction') {
      typeFields += `<div class="form-group"><label>Filename</label><input id="ef-filename" value="${data.filename ?? ''}" /></div>`;
    }

    this.container.innerHTML = `
      <div class="section-header">Entity: ${entity.id}</div>
      <div class="level-info-grid">
        <span class="label">Type</span><span>${entityDef.type}</span>
        <span class="label">Position</span><span>${data.col ?? '—'}, ${data.row ?? '—'}</span>
      </div>
      ${typeFields}
      <div class="section-header" style="margin-top:8px">Event Spawning</div>
      <div class="form-group"><label>Spawn on Any Event (comma-sep)</label>
        <input id="ef-any" value="${(entityDef.createOnAnyEvent ?? []).join(', ')}" /></div>
      <div class="form-group"><label>Spawn on All Events (comma-sep)</label>
        <input id="ef-all" value="${(entityDef.createOnAllEvents ?? []).join(', ')}" /></div>
      <div class="form-group"><label><input type="checkbox" id="ef-respawn" ${entityDef.respawnable ? 'checked' : ''} /> Respawnable</label></div>
      <div style="margin-top:8px"><button class="ed-btn danger" id="ef-delete">Delete Entity</button></div>
    `;

    // Prevent WASD in inputs
    for (const input of this.container.querySelectorAll('input, textarea')) {
      input.addEventListener('keydown', (e: Event) => (e as KeyboardEvent).stopPropagation());
    }

    // Wire up common fields
    this.container.querySelector('#ef-any')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
      this.bridge.updateEntityMeta(entity.id, { createOnAnyEvent: val });
    });
    this.container.querySelector('#ef-all')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
      this.bridge.updateEntityMeta(entity.id, { createOnAllEvents: val });
    });
    this.container.querySelector('#ef-respawn')?.addEventListener('change', (e) => {
      this.bridge.updateEntityMeta(entity.id, { respawnable: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-delete')?.addEventListener('click', () => {
      this.bridge.removeEntity(entity.id);
    });

    // Type-specific wiring
    this.container.querySelector('#ef-diff')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { difficulty: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-dir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { startDirection: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-event')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { eventToRaise: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-oneshot')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { oneShot: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-target')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { targetLevel: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-tcol')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { targetCol: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-trow')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { targetRow: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-events')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entity.id, { eventsToRaise: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-cellmod')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entity.id, { cellsToModify: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-assets')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { assets: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-npcdir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { direction: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-npcname')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { name: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-interactions')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entity.id, { interactions: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-btex')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { texture: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-bhealth')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { health: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-brarity')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { rarity: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-filename')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entity.id, { filename: (e.target as HTMLInputElement).value });
    });
  }
}
