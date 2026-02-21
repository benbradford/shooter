import { EditorState } from './EditorState';
import type { CellModification } from '../ecs/components/core/CellModifierComponent';
import type { CellProperty } from '../systems/grid/Grid';

export class CellModifierEditorState extends EditorState {
  private cellModifiers: Array<{ id: string; eventName: string; cellsToModify: CellModification[] }> = [];
  private selectedIndex: number = -1;

  onEnter(): void {
    this.loadCellModifiers();
    this.createUI();
  }

  onExit(): void {
    this.destroyUI();
  }

  private loadCellModifiers(): void {
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; createOnEvent?: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();
    
    this.cellModifiers = [];
    for (const entity of levelData.entities ?? []) {
      if (entity.type === 'cellmodifier') {
        this.cellModifiers.push({
          id: entity.id,
          eventName: entity.createOnEvent ?? '',
          cellsToModify: entity.data.cellsToModify as CellModification[]
        });
      }
    }
  }

  private createUI(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Cell Modifiers';
    title.style.marginTop = '0';
    container.appendChild(title);

    const list = document.createElement('div');
    list.style.marginBottom = '10px';
    
    if (this.cellModifiers.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No cell modifiers';
      empty.style.color = '#888';
      list.appendChild(empty);
    } else {
      this.cellModifiers.forEach((cm, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 10px;
          margin: 5px 0;
          background: ${this.selectedIndex === index ? '#444' : '#222'};
          border-radius: 4px;
          cursor: pointer;
        `;
        item.textContent = `${cm.id} (${cm.eventName}) - ${cm.cellsToModify.length} cells`;
        item.onclick = () => {
          this.selectedIndex = index;
          this.destroyUI();
          this.createUI();
        };
        list.appendChild(item);
      });
    }
    container.appendChild(list);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';

    const addButton = document.createElement('button');
    addButton.textContent = 'Add New';
    addButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    addButton.onclick = () => this.showEditForm(null);
    buttonContainer.appendChild(addButton);

    if (this.selectedIndex >= 0) {
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
      editButton.onclick = () => this.showEditForm(this.cellModifiers[this.selectedIndex]);
      buttonContainer.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.style.cssText = 'padding: 8px 16px; cursor: pointer; background: #c00;';
      deleteButton.onclick = () => this.deleteCellModifier();
      buttonContainer.appendChild(deleteButton);
    }

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    backButton.onclick = () => this.scene.enterDefaultMode();
    buttonContainer.appendChild(backButton);

    container.appendChild(buttonContainer);
    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private showEditForm(existing: { id: string; eventName: string; cellsToModify: CellModification[] } | null): void {
    this.destroyUI();

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = existing ? 'Edit Cell Modifier' : 'Add Cell Modifier';
    title.style.marginTop = '0';
    container.appendChild(title);

    const eventLabel = document.createElement('label');
    eventLabel.textContent = 'Event Name:';
    eventLabel.style.display = 'block';
    eventLabel.style.marginTop = '10px';
    container.appendChild(eventLabel);

    const eventInput = document.createElement('input');
    eventInput.type = 'text';
    eventInput.value = existing?.eventName ?? '';
    eventInput.style.cssText = 'width: 100%; padding: 5px; margin-top: 5px;';
    eventInput.addEventListener('keydown', (e) => e.stopPropagation());
    container.appendChild(eventInput);

    const cellsLabel = document.createElement('h4');
    cellsLabel.textContent = 'Cells to Modify:';
    cellsLabel.style.marginTop = '15px';
    container.appendChild(cellsLabel);

    const cellsList = document.createElement('div');
    cellsList.id = 'cells-list';
    container.appendChild(cellsList);

    const cells: CellModification[] = existing ? [...existing.cellsToModify] : [];

    const renderCells = () => {
      cellsList.innerHTML = '';
      cells.forEach((cell, index) => {
        const cellDiv = document.createElement('div');
        cellDiv.style.cssText = 'background: #222; padding: 10px; margin: 5px 0; border-radius: 4px;';
        
        const inputs = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label>Col:</label>
              <input type="number" class="cell-col" value="${cell.col}" style="width: 100%; padding: 5px;">
            </div>
            <div>
              <label>Row:</label>
              <input type="number" class="cell-row" value="${cell.row}" style="width: 100%; padding: 5px;">
            </div>
          </div>
          <div style="margin-bottom: 10px;">
            <label>Layer (optional):</label>
            <input type="number" class="cell-layer" value="${cell.layer ?? ''}" placeholder="Leave empty to keep existing" style="width: 100%; padding: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label>Background Texture (optional):</label>
            <input type="text" class="cell-texture" value="${cell.backgroundTexture ?? ''}" placeholder="Leave empty to remove" style="width: 100%; padding: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label>Properties (comma-separated, optional):</label>
            <input type="text" class="cell-properties" value="${cell.properties?.join(',') ?? ''}" placeholder="wall,platform,stairs or empty to clear" style="width: 100%; padding: 5px;">
          </div>
        `;
        cellDiv.innerHTML = inputs;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.cssText = 'padding: 5px 10px; cursor: pointer; background: #c00;';
        removeBtn.onclick = () => {
          cells.splice(index, 1);
          renderCells();
        };
        cellDiv.appendChild(removeBtn);

        const colInput = cellDiv.querySelector('.cell-col') as HTMLInputElement;
        const rowInput = cellDiv.querySelector('.cell-row') as HTMLInputElement;
        const layerInput = cellDiv.querySelector('.cell-layer') as HTMLInputElement;
        const textureInput = cellDiv.querySelector('.cell-texture') as HTMLInputElement;
        const propsInput = cellDiv.querySelector('.cell-properties') as HTMLInputElement;

        [colInput, rowInput, layerInput, textureInput, propsInput].forEach(input => {
          input.addEventListener('keydown', (e) => e.stopPropagation());
          input.addEventListener('change', () => {
            cell.col = Number.parseInt(colInput.value);
            cell.row = Number.parseInt(rowInput.value);
            cell.layer = layerInput.value ? Number.parseInt(layerInput.value) : undefined;
            cell.backgroundTexture = textureInput.value || undefined;
            const propsStr = propsInput.value.trim();
            cell.properties = propsStr ? propsStr.split(',').map(p => p.trim()) as CellProperty[] : undefined;
          });
        });

        cellsList.appendChild(cellDiv);
      });
    };

    renderCells();

    const addCellBtn = document.createElement('button');
    addCellBtn.textContent = 'Add Cell';
    addCellBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; margin-top: 10px;';
    addCellBtn.onclick = () => {
      cells.push({ col: 0, row: 0 });
      renderCells();
    };
    container.appendChild(addCellBtn);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 15px;';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = 'padding: 8px 16px; cursor: pointer; background: #0a0;';
    saveButton.onclick = () => {
      const eventName = eventInput.value.trim();
      if (!eventName) {
        alert('Event name is required');
        return;
      }
      if (cells.length === 0) {
        alert('At least one cell is required');
        return;
      }
      this.saveCellModifier(existing?.id ?? null, eventName, cells);
    };
    buttonContainer.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    cancelButton.onclick = () => {
      this.destroyUI();
      this.createUI();
    };
    buttonContainer.appendChild(cancelButton);

    container.appendChild(buttonContainer);
    document.body.appendChild(container);
    this.uiContainer = container;
  }

  private saveCellModifier(existingId: string | null, eventName: string, cellsToModify: CellModification[]): void {
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; createOnEvent?: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();

    levelData.entities ??= [];

    if (existingId) {
      const index = levelData.entities.findIndex((e) => e.id === existingId);
      if (index >= 0) {
        levelData.entities[index].data = { cellsToModify };
        levelData.entities[index].createOnEvent = eventName;
      }
    } else {
      let id = 'cellmodifier0';
      let counter = 0;
      while (levelData.entities.some((e) => e.id === id)) {
        counter++;
        id = `cellmodifier${counter}`;
      }

      levelData.entities.push({
        id,
        type: 'cellmodifier',
        createOnEvent: eventName,
        data: { cellsToModify }
      });
    }

    this.destroyUI();
    this.loadCellModifiers();
    this.createUI();
  }

  private deleteCellModifier(): void {
    if (this.selectedIndex < 0) return;

    const cm = this.cellModifiers[this.selectedIndex];
    const gameScene = this.scene.scene.get('game') as unknown as { getLevelData: () => { entities?: Array<{ id: string; type: string; createOnEvent?: string; data: Record<string, unknown> }> } };
    const levelData = gameScene.getLevelData();

    const index = levelData.entities?.findIndex((e) => e.id === cm.id) ?? -1;
    if (index >= 0 && levelData.entities) {
      levelData.entities.splice(index, 1);
    }

    this.selectedIndex = -1;
    this.destroyUI();
    this.loadCellModifiers();
    this.createUI();
  }
}
