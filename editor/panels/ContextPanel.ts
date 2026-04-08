import type { EditorBridge } from '../EditorBridge';
import { TexturePicker } from './TexturePicker';
import type { PickResult } from './TexturePicker';
import { ASSET_REGISTRY } from '../../src/assets/AssetRegistry';

export class ContextPanel {
  private readonly texturePicker: TexturePicker;

  constructor(private readonly bridge: EditorBridge, private readonly container: HTMLElement) {
    this.texturePicker = new TexturePicker(bridge);
    this.showLevelInfo();
  }

  clear(): void {
    this.container.innerHTML = '';
  }

  async showStatePanel(): Promise<void> {
    type FullState = {
      player: { health: number; coins: number; currentLevel?: string; spawnCol?: number; spawnRow?: number; entryCell?: { col: number; row: number } };
      flags: Record<string, string>;
      levels?: Record<string, {
        liveEntities: string[];
        destroyedEntities: string[];
        firedTriggers: string[];
        modifiedCells: Array<{ col: number; row: number; properties?: string[]; backgroundTexture?: string; layer?: number }>;
      }>;
    };
    let state: FullState;
    try {
      const res = await fetch('/states/default.json');
      state = await res.json() as FullState;
    } catch {
      this.container.innerHTML = '<p>No default.json found</p>';
      return;
    }

    // Populate levels from available level files so all are editable
    try {
      const levelsRes = await fetch('/api/levels');
      const levels = await levelsRes.json() as Array<{ name: string }>;
      state.levels ??= {};
      for (const l of levels) {
        if (!state.levels[l.name]) {
          state.levels[l.name] = { liveEntities: [], destroyedEntities: [], firedTriggers: [], modifiedCells: [] };
        }
      }
    } catch { /* levels API not available */ }

    const flagEntries = Object.entries(state.flags ?? {});
    const levelEntries = Object.entries(state.levels ?? {});

    const renderStringList = (items: string[], cls: string): string =>
      items.map(v => `<div class="st-list-item"><input class="${cls}" value="${v}" /><button class="ed-btn danger st-ldel" style="padding:1px 5px;font-size:10px">✕</button></div>`).join('');

    const renderLevelSection = (levelName: string, data: NonNullable<FullState['levels']>[string]): string => {
      const fields = [
        { key: 'liveEntities', label: 'Live Entities', items: data.liveEntities },
        { key: 'destroyedEntities', label: 'Destroyed Entities', items: data.destroyedEntities },
        { key: 'firedTriggers', label: 'Fired Triggers', items: data.firedTriggers },
      ];
      return `
        <div class="collapsible-header section-header" data-target="lvl-${levelName}">${levelName}</div>
        <div class="collapsible-body" id="lvl-${levelName}">
          ${fields.map(f => `
            <div class="collapsible-header" data-target="lvl-${levelName}-${f.key}" style="font-size:11px;color:#95a5a6;margin:4px 0 2px">${f.label} (${f.items.length})</div>
            <div class="collapsible-body" id="lvl-${levelName}-${f.key}">
              <div class="st-list-container" data-level="${levelName}" data-field="${f.key}">${renderStringList(f.items, `st-lval`)}</div>
              <button class="ed-btn st-ladd" data-level="${levelName}" data-field="${f.key}" style="font-size:10px;margin:2px 0 4px">+ Add</button>
            </div>
          `).join('')}
          <div class="collapsible-header" data-target="lvl-${levelName}-modifiedCells" style="font-size:11px;color:#95a5a6;margin:4px 0 2px">Modified Cells (${data.modifiedCells.length})</div>
          <div class="collapsible-body" id="lvl-${levelName}-modifiedCells">
            <textarea class="st-mcells" data-level="${levelName}" rows="4" style="font-size:10px;width:100%">${JSON.stringify(data.modifiedCells, null, 2)}</textarea>
          </div>
        </div>`;
    };

    this.container.innerHTML = `
      <div class="section-header">Player</div>
      <div class="form-group"><label>Health</label><input type="number" id="st-health" value="${state.player.health}" /></div>
      <div class="form-group"><label>Coins</label><input type="number" id="st-coins" value="${state.player.coins}" /></div>
      <div class="section-header" style="margin-top:8px">Flags</div>
      <div id="st-flags">
        ${flagEntries.map(([k, v]) => `<div class="form-group" style="display:flex;gap:4px;align-items:center">
          <input class="st-fkey" value="${k}" style="flex:1" /><input class="st-fval" value="${v}" style="flex:1" />
          <button class="ed-btn danger st-fdel" style="padding:2px 6px">✕</button>
        </div>`).join('')}
      </div>
      <button class="ed-btn" id="st-add-flag" style="width:100%;margin-bottom:8px">+ Add Flag</button>
      <div class="section-header" style="margin-top:8px">Levels</div>
      <div id="st-levels">${levelEntries.map(([name, data]) => renderLevelSection(name, data)).join('')}</div>
      <button class="ed-btn save" id="st-save" style="width:100%;margin-top:8px">Save State</button>
    `;

    // Prevent WASD in all inputs/textareas
    for (const el of this.container.querySelectorAll<HTMLElement>('input, textarea')) {
      el.addEventListener('keydown', e => e.stopPropagation());
    }

    // Collapsible toggle
    for (const header of this.container.querySelectorAll<HTMLElement>('.collapsible-header')) {
      header.addEventListener('click', () => {
        header.classList.toggle('open');
        const body = this.container.querySelector(`#${header.dataset.target}`) as HTMLElement | null;
        body?.classList.toggle('open');
      });
    }

    // Delete buttons (flags)
    for (const btn of this.container.querySelectorAll('.st-fdel')) {
      btn.addEventListener('click', () => btn.parentElement!.remove());
    }

    // Delete buttons (list items)
    for (const btn of this.container.querySelectorAll('.st-ldel')) {
      btn.addEventListener('click', () => btn.parentElement!.remove());
    }

    // Add flag
    this.container.querySelector('#st-add-flag')?.addEventListener('click', () => {
      const flagsDiv = this.container.querySelector('#st-flags')!;
      const row = document.createElement('div');
      row.className = 'form-group';
      row.style.cssText = 'display:flex;gap:4px;align-items:center';
      row.innerHTML = `<input class="st-fkey" value="" style="flex:1" placeholder="key" /><input class="st-fval" value="" style="flex:1" placeholder="value" /><button class="ed-btn danger st-fdel" style="padding:2px 6px">✕</button>`;
      for (const input of row.querySelectorAll('input')) input.addEventListener('keydown', e => e.stopPropagation());
      row.querySelector('.st-fdel')!.addEventListener('click', () => row.remove());
      flagsDiv.appendChild(row);
    });

    // Add list item buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.st-ladd')) {
      btn.addEventListener('click', () => {
        const container = this.container.querySelector(`.st-list-container[data-level="${btn.dataset.level}"][data-field="${btn.dataset.field}"]`)!;
        const row = document.createElement('div');
        row.className = 'st-list-item';
        row.innerHTML = `<input class="st-lval" value="" /><button class="ed-btn danger st-ldel" style="padding:1px 5px;font-size:10px">✕</button>`;
        row.querySelector('input')!.addEventListener('keydown', e => e.stopPropagation());
        row.querySelector('.st-ldel')!.addEventListener('click', () => row.remove());
        container.appendChild(row);
      });
    }

    // Save
    this.container.querySelector('#st-save')?.addEventListener('click', async () => {
      state.player.health = Number.parseInt((this.container.querySelector('#st-health') as HTMLInputElement).value);
      state.player.coins = Number.parseInt((this.container.querySelector('#st-coins') as HTMLInputElement).value);

      // Collect flags
      const fkeys = this.container.querySelectorAll<HTMLInputElement>('.st-fkey');
      const fvals = this.container.querySelectorAll<HTMLInputElement>('.st-fval');
      state.flags = {};
      fkeys.forEach((k, i) => { if (k.value.trim()) state.flags[k.value.trim()] = fvals[i].value; });

      // Collect levels
      state.levels ??= {};
      for (const levelName of Object.keys(state.levels)) {
        const level = state.levels[levelName];
        for (const field of ['liveEntities', 'destroyedEntities', 'firedTriggers'] as const) {
          const inputs = this.container.querySelectorAll<HTMLInputElement>(`.st-list-container[data-level="${levelName}"][data-field="${field}"] .st-lval`);
          level[field] = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
        }
        const mcTextarea = this.container.querySelector<HTMLTextAreaElement>(`.st-mcells[data-level="${levelName}"]`);
        if (mcTextarea) {
          try { level.modifiedCells = JSON.parse(mcTextarea.value); } catch { /* keep existing */ }
        }
      }

      try {
        await fetch('/api/save-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state, null, 2) });
        this.bridge.toast?.show('State saved', 'success');
      } catch (err) { this.bridge.toast?.show(`Save failed: ${err}`, 'error'); }
    });
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
        <span class="label">Theme</span><select id="li-theme" style="font-size:11px">${['dungeon', 'swamp', 'grass', 'wilds', 'default'].map(t => `<option ${(levelData.levelTheme ?? 'dungeon') === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <span class="label">Entities</span><span>${entityCount}</span>
        <span class="label">Player</span><span style="display:flex;gap:4px"><input type="number" id="li-px" value="${levelData.playerStart.x}" style="width:50px;font-size:11px"> <input type="number" id="li-py" value="${levelData.playerStart.y}" style="width:50px;font-size:11px"></span>
      </div>
      <div class="section-header" style="margin-top:12px">Resize</div>
      <div class="toolbar-row">
        <button class="ed-btn" id="ri-add-col">+ Col</button>
        <button class="ed-btn" id="ri-add-row">+ Row</button>
        <button class="ed-btn danger" id="ri-rem-col">- Col</button>
        <button class="ed-btn danger" id="ri-rem-row">- Row</button>
      </div>

      <div class="section-header" style="margin-top:12px">Data Entities</div>
      ${(['interaction', 'eventchainer', 'cellmodifier'] as const).map(type => {
        const items = (levelData.entities ?? []).filter(e => e.type === type);
        return `<div style="margin-bottom:4px">
          <span style="font-size:11px;color:#7f8c8d">${type} (${items.length})</span>
          ${items.map(e => `<button class="ed-btn de-item" data-id="${e.id}" style="display:block;width:100%;text-align:left;font-size:11px;margin:1px 0">${e.id}</button>`).join('')}
          <button class="ed-btn de-add" data-type="${type}" style="font-size:10px;margin-top:2px">+ Add ${type}</button>
        </div>`;
      }).join('')}
    `;
    this.container.querySelector('#ri-add-col')?.addEventListener('click', () => { this.bridge.resizeGrid(grid.width + 1, grid.height); this.showLevelInfo(); });
    this.container.querySelector('#ri-add-row')?.addEventListener('click', () => { this.bridge.resizeGrid(grid.width, grid.height + 1); this.showLevelInfo(); });
    this.container.querySelector('#ri-rem-col')?.addEventListener('click', () => { if (grid.width > 1) { this.bridge.resizeGrid(grid.width - 1, grid.height); this.showLevelInfo(); } });
    this.container.querySelector('#ri-rem-row')?.addEventListener('click', () => { if (grid.height > 1) { this.bridge.resizeGrid(grid.width, grid.height - 1); this.showLevelInfo(); } });
    this.container.querySelector('#li-theme')?.addEventListener('change', (e) => { this.bridge.setTheme((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).blur(); });
    const updatePlayerStart = () => {
      const px = Number.parseInt((this.container.querySelector('#li-px') as HTMLInputElement).value);
      const py = Number.parseInt((this.container.querySelector('#li-py') as HTMLInputElement).value);
      if (!Number.isNaN(px) && !Number.isNaN(py)) {
        levelData.playerStart = { x: px, y: py };
        this.bridge.movePlayer(px, py);
      }
    };
    this.container.querySelector('#li-px')?.addEventListener('change', updatePlayerStart);
    this.container.querySelector('#li-py')?.addEventListener('change', updatePlayerStart);
    for (const input of this.container.querySelectorAll('input')) {
      input.addEventListener('keydown', e => e.stopPropagation());
    }

    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.de-item')) {
      btn.addEventListener('click', () => this.showDataEntityForm(btn.dataset.id!));
    }
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.de-add')) {
      btn.addEventListener('click', () => {
        this.bridge.addEntity(btn.dataset.type as import('../../src/systems/level/LevelLoader').EntityType, 0, 0);
        this.showLevelInfo();
      });
    }
  }

  showCellForm(col: number, row: number): void {
    const grid = this.bridge.getGrid();
    const cell = grid.getCell(col, row);
    if (!cell) return;
    const layer = grid.getLayer(cell);
    const props = Array.from(cell.properties);
    const allProps = ['wall', 'platform', 'stairs', 'water', 'bridge', 'blocked', 'path'];

    // Read full texture config from levelData (preserves transformOverride)
    const levelData = this.bridge.getScene().getLevelData();
    const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
    const bgTex = levelCell?.backgroundTexture;
    const texKey = typeof bgTex === 'string' ? bgTex : bgTex?.image ?? cell.backgroundTexture ?? '';
    const transform = typeof bgTex === 'object' && bgTex && 'transformOverride' in bgTex ? bgTex.transformOverride : null;
    const animTex = levelCell?.animatedTexture;
    const animTransform = animTex?.transformOverride;

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
          <span style="flex:1;font-size:11px;color:#95a5a6">${texKey || '(none)'}</span>
          <button class="ed-btn" id="cf-choose-tex">Choose</button>
          <button class="ed-btn danger" id="cf-clear-tex">✕</button>
        </div>
      </div>
      ${texKey ? `
      <div class="section-header">Transform Override</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div class="form-group"><label>scaleX</label><input type="number" id="cf-sx" value="${transform?.scaleX ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>scaleY</label><input type="number" id="cf-sy" value="${transform?.scaleY ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>offsetX</label><input type="number" id="cf-ox" value="${transform?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>offsetY</label><input type="number" id="cf-oy" value="${transform?.offsetY ?? 0}" /></div>
      </div>
      <button class="ed-btn" id="cf-apply-transform" style="width:100%;margin-bottom:6px">Apply Transform</button>
      ` : ''}
      ${animTex ? `
      <div class="section-header">Animated Texture</div>
      <div class="level-info-grid" style="font-size:11px">
        <span class="label">Spritesheet</span><span>${animTex.spritesheet}</span>
        <span class="label">Frames</span><span>${animTex.frameCount} @ ${animTex.frameRate}fps</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
        <div class="form-group"><label>scaleX</label><input type="number" id="cf-asx" value="${animTransform?.scaleX ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>scaleY</label><input type="number" id="cf-asy" value="${animTransform?.scaleY ?? 1}" step="0.1" /></div>
        <div class="form-group"><label>offsetX</label><input type="number" id="cf-aox" value="${animTransform?.offsetX ?? 0}" /></div>
        <div class="form-group"><label>offsetY</label><input type="number" id="cf-aoy" value="${animTransform?.offsetY ?? 0}" /></div>
      </div>
      <button class="ed-btn" id="cf-apply-anim-transform" style="width:100%;margin-bottom:4px">Apply Anim Transform</button>
      <button class="ed-btn danger" id="cf-clear-anim" style="width:100%;margin-bottom:6px">Remove Animated Texture</button>
      ` : `
      <button class="ed-btn" id="cf-add-anim" style="width:100%;margin-bottom:6px">+ Animated Texture</button>
      `}
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
      this.texturePicker.open((result: PickResult) => {
        const levelData = this.bridge.getScene().getLevelData();
        let levelCell = levelData.cells.find(c => c.col === col && c.row === row);
        if (!levelCell) { levelCell = { col, row }; levelData.cells.push(levelCell); }

        if (result.type === 'image') {
          this.bridge.setCellTexture(col, row, result.key);
        } else if (result.type === 'animated') {
          const asset = ASSET_REGISTRY[result.key as keyof typeof ASSET_REGISTRY] as { config?: { frameWidth: number; frameHeight: number } };
          levelCell.animatedTexture = {
            spritesheet: result.key,
            frameWidth: asset.config?.frameWidth ?? 64,
            frameHeight: asset.config?.frameHeight ?? 64,
            frameCount: 2,
            frameRate: 8,
          };
          this.bridge.getScene().refreshSprites();
        } else if (result.type === 'spritesheet') {
          levelCell.backgroundTexture = {
            image: result.key,
            sourceRect: result.sourceRect,
            ...(result.scaleX !== undefined || result.scaleY !== undefined ? {
              transformOverride: { scaleX: result.scaleX ?? 1, scaleY: result.scaleY ?? 1, offsetX: 0, offsetY: 0 }
            } : {})
          };
          this.bridge.getScene().refreshSprites();
        }
        this.showCellForm(col, row);
      });
    });
    this.container.querySelector('#cf-clear-tex')?.addEventListener('click', () => {
      this.bridge.clearCellTexture(col, row);
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-apply-transform')?.addEventListener('click', () => {
      const get = (id: string) => Number.parseFloat((this.container.querySelector(`#${id}`) as HTMLInputElement).value);
      const levelData = this.bridge.getScene().getLevelData();
      let levelCell = levelData.cells.find(c => c.col === col && c.row === row);
      if (!levelCell) { levelCell = { col, row }; levelData.cells.push(levelCell); }
      const currentKey = typeof levelCell.backgroundTexture === 'string'
        ? levelCell.backgroundTexture
        : (levelCell.backgroundTexture as { image?: string })?.image ?? '';
      if (currentKey) {
        const existing = typeof levelCell.backgroundTexture === 'object' ? levelCell.backgroundTexture : {};
        levelCell.backgroundTexture = {
          ...existing,
          image: currentKey,
          transformOverride: { scaleX: get('cf-sx'), scaleY: get('cf-sy'), offsetX: get('cf-ox'), offsetY: get('cf-oy') }
        };
        this.bridge.getScene().refreshSprites();
      }
    });
    this.container.querySelector('#cf-apply-anim-transform')?.addEventListener('click', () => {
      const get = (id: string) => Number.parseFloat((this.container.querySelector(`#${id}`) as HTMLInputElement).value);
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc?.animatedTexture) {
        lc.animatedTexture.transformOverride = { scaleX: get('cf-asx'), scaleY: get('cf-asy'), offsetX: get('cf-aox'), offsetY: get('cf-aoy') };
        this.bridge.getScene().refreshSprites();
      }
    });
    this.container.querySelector('#cf-clear-anim')?.addEventListener('click', () => {
      const levelData = this.bridge.getScene().getLevelData();
      const lc = levelData.cells.find(c => c.col === col && c.row === row);
      if (lc) { delete lc.animatedTexture; this.bridge.getScene().refreshSprites(); }
      this.showCellForm(col, row);
    });
    this.container.querySelector('#cf-add-anim')?.addEventListener('click', () => {
      this.texturePicker.open((result: PickResult) => {
        if (result.type !== 'animated') return;
        const levelData = this.bridge.getScene().getLevelData();
        let lc = levelData.cells.find(c => c.col === col && c.row === row);
        if (!lc) { lc = { col, row }; levelData.cells.push(lc); }
        const asset = ASSET_REGISTRY[result.key as keyof typeof ASSET_REGISTRY] as { config?: { frameWidth: number; frameHeight: number } };
        lc.animatedTexture = {
          spritesheet: result.key,
          frameWidth: asset.config?.frameWidth ?? 64,
          frameHeight: asset.config?.frameHeight ?? 64,
          frameCount: 2,
          frameRate: 8,
        };
        this.bridge.getScene().refreshSprites();
        this.showCellForm(col, row);
      });
    });
    this.container.querySelector('#cf-clear')?.addEventListener('click', () => {
      this.bridge.clearCell(col, row);
      this.showCellForm(col, row);
    });
  }

  showDataEntityForm(entityId: string): void {
    const levelData = this.bridge.getScene().getLevelData();
    const entityDef = levelData.entities?.find(e => e.id === entityId);
    if (!entityDef) return;
    // Render the form using a minimal fake entity shell
    const fakeEntity = { id: entityId, tags: new Set<string>() } as import('../../src/ecs/Entity').Entity;
    this.showEntityForm(fakeEntity);
  }

  showEntityForm(entity: import('../../src/ecs/Entity').Entity): void {
    const levelData = this.bridge.getScene().getLevelData();
    let entityDef = levelData.entities?.find(e => e.id === entity.id);
    // Resolve exit's internal trigger to parent exit
    if (!entityDef && entity.id.endsWith('_trigger')) {
      const parentId = entity.id.replace(/_trigger$/, '');
      entityDef = levelData.entities?.find(e => e.id === parentId);
    }
    if (!entityDef) {
      this.container.innerHTML = `<div class="section-header">Entity: ${entity.id}</div><p>No level data found</p>`;
      return;
    }
    const entityId = entityDef.id;

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
        <div id="ef-tcells">${cells.map((c, i) => `<span style="font-size:11px">${i}: (${c.col},${c.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-edit-cells">Edit Cells</button></div>`;
    }
    if (entityDef.type === 'exit') {
      const cells = (data.triggerCells as Array<{col: number; row: number}>) ?? [];
      typeFields += `<div class="form-group"><label>Target Level</label><input id="ef-target" value="${data.targetLevel ?? ''}" /></div>
        <div class="form-group"><label>Target Col</label><input type="number" id="ef-tcol" value="${data.targetCol ?? 0}" /></div>
        <div class="form-group"><label>Target Row</label><input type="number" id="ef-trow" value="${data.targetRow ?? 0}" /></div>
        <div class="form-group"><label>Trigger Cells (${cells.length})</label>
        <div id="ef-tcells">${cells.map((c, i) => `<span style="font-size:11px">${i}: (${c.col},${c.row}) </span>`).join('')}</div>
        <button class="ed-btn" id="ef-edit-cells">Edit Cells</button></div>
        <button class="ed-btn play" id="ef-leave" style="width:100%;margin-top:4px">Leave → ${data.targetLevel ?? '?'}</button>`;
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
        <select id="ef-npcdir">${['Down', 'Up', 'Left', 'Right', 'DownLeft', 'DownRight', 'UpLeft', 'UpRight', 'facePlayer'].map(d => `<option ${data.direction === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="form-group"><label>Name</label><input id="ef-npcname" value="${data.name ?? ''}" /></div>
        <div class="form-group" style="font-size:11px;color:#7f8c8d;margin-top:4px">Transform</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div class="form-group"><label>scaleX</label><input type="number" id="ef-nsx" value="${(data.transformOverride as any)?.scaleX ?? 1}" step="0.1" /></div>
          <div class="form-group"><label>scaleY</label><input type="number" id="ef-nsy" value="${(data.transformOverride as any)?.scaleY ?? 1}" step="0.1" /></div>
          <div class="form-group"><label>offsetX</label><input type="number" id="ef-nox" value="${(data.transformOverride as any)?.offsetX ?? 0}" step="1" /></div>
          <div class="form-group"><label>offsetY</label><input type="number" id="ef-noy" value="${(data.transformOverride as any)?.offsetY ?? 0}" step="1" /></div>
        </div>
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
      <div class="section-header">Entity: ${entityId}</div>
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
      this.bridge.updateEntityMeta(entityId, { createOnAnyEvent: val });
    });
    this.container.querySelector('#ef-all')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean);
      this.bridge.updateEntityMeta(entityId, { createOnAllEvents: val });
    });
    this.container.querySelector('#ef-respawn')?.addEventListener('change', (e) => {
      this.bridge.updateEntityMeta(entityId, { respawnable: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-delete')?.addEventListener('click', () => {
      this.bridge.removeEntity(entityId);
    });

    // Type-specific wiring
    this.container.querySelector('#ef-diff')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { difficulty: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-dir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { startDirection: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-event')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { eventToRaise: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-oneshot')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { oneShot: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ef-edit-cells')?.addEventListener('click', () => {
      const isEditing = this.bridge.editingTriggerCells === entityId;
      this.bridge.editingTriggerCells = isEditing ? null : entityId;
      const btn = this.container.querySelector('#ef-edit-cells') as HTMLButtonElement;
      btn.textContent = isEditing ? 'Edit Cells' : 'Done Editing';
      btn.classList.toggle('save', !isEditing);
    });
    this.container.querySelector('#ef-target')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetLevel: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-leave')?.addEventListener('click', () => {
      const target = (this.container.querySelector('#ef-target') as HTMLInputElement)?.value;
      if (target) void this.bridge.loadLevel(target);
    });
    this.container.querySelector('#ef-tcol')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetCol: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-trow')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { targetRow: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-events')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entityId, { eventsToRaise: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-cellmod')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entityId, { cellsToModify: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-assets')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { assets: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-npcdir')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { direction: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-npcname')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { name: (e.target as HTMLInputElement).value });
    });
    const applyNpcTransform = () => {
      const sx = Number.parseFloat((this.container.querySelector('#ef-nsx') as HTMLInputElement)?.value ?? '1');
      const sy = Number.parseFloat((this.container.querySelector('#ef-nsy') as HTMLInputElement)?.value ?? '1');
      const ox = Number.parseFloat((this.container.querySelector('#ef-nox') as HTMLInputElement)?.value ?? '0');
      const oy = Number.parseFloat((this.container.querySelector('#ef-noy') as HTMLInputElement)?.value ?? '0');
      if (Number.isNaN(sx) || Number.isNaN(sy) || Number.isNaN(ox) || Number.isNaN(oy)) return;
      this.bridge.updateEntityData(entityId, { transformOverride: { scaleX: sx, scaleY: sy, offsetX: ox, offsetY: oy } });
    };
    for (const id of ['#ef-nsx', '#ef-nsy', '#ef-nox', '#ef-noy']) {
      this.container.querySelector(id)?.addEventListener('input', applyNpcTransform);
    }
    this.container.querySelector('#ef-interactions')?.addEventListener('change', (e) => {
      try { this.bridge.updateEntityData(entityId, { interactions: JSON.parse((e.target as HTMLTextAreaElement).value) }); } catch { /* invalid json */ }
    });
    this.container.querySelector('#ef-btex')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { texture: (e.target as HTMLInputElement).value });
    });
    this.container.querySelector('#ef-bhealth')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { health: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ef-brarity')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { rarity: (e.target as HTMLSelectElement).value });
    });
    this.container.querySelector('#ef-filename')?.addEventListener('change', (e) => {
      this.bridge.updateEntityData(entityId, { filename: (e.target as HTMLInputElement).value });
    });
  }

  showBlockedAreaForm(areaId: string): void {
    const levelData = this.bridge.getScene().getLevelData();
    const area = levelData.blockedAreas?.find(a => a.id === areaId);
    if (!area) { this.clear(); return; }

    this.container.innerHTML = `
      <h3 style="margin:0 0 8px;color:#e0e0e0">Blocked Area: ${area.id}</h3>
      <div class="form-group"><label>Layer</label>
        <input type="number" id="ba-layer" value="${area.layer}" min="0" max="2" style="width:50px" /></div>
      <div class="form-group"><label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="ba-projectiles" ${area.blocksProjectiles ? 'checked' : ''} /> Blocks Projectiles</label></div>
      <div class="form-group" style="color:#7f8c8d;font-size:11px">${area.vertices.length} vertices</div>
      <button class="ed-btn" id="ba-delete" style="background:#c0392b;margin-top:8px">Delete</button>
    `;

    this.container.querySelector('#ba-layer')?.addEventListener('change', (e) => {
      this.bridge.updateBlockedArea(areaId, { layer: Number.parseInt((e.target as HTMLInputElement).value) });
    });
    this.container.querySelector('#ba-projectiles')?.addEventListener('change', (e) => {
      this.bridge.updateBlockedArea(areaId, { blocksProjectiles: (e.target as HTMLInputElement).checked });
    });
    this.container.querySelector('#ba-delete')?.addEventListener('click', () => {
      this.bridge.removeBlockedArea(areaId);
      this.clear();
    });
  }
}
