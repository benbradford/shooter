import { EditorState } from './EditorState';
import type GameScene from '../scenes/GameScene';
import type { LevelSpawner } from '../systems/level/LevelLoader';

export class SpawnerEditorState extends EditorState {
  private selectedSpawnerIndex: number = -1;
  private spawners: LevelSpawner[] = [];

  onEnter(): void {
    const gameScene = this.scene.scene.get('game') as GameScene;
    const levelData = gameScene.getLevelData();
    this.spawners = levelData.spawners ?? [];

    this.createUI();
  }

  onExit(): void {
    this.destroyUI();
  }

  private createUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      pointer-events: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Enemy Spawners';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    // List existing spawners
    if (this.spawners.length > 0) {
      const list = document.createElement('div');
      list.style.marginBottom = '20px';

      this.spawners.forEach((spawner, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 10px;
          margin: 5px 0;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          cursor: pointer;
        `;
        item.textContent = `Event: ${spawner.eventName} (${spawner.enemyIds.length} enemies, ${spawner.spawnDelayMs}ms delay)`;
        item.onclick = () => this.editSpawner(index);
        list.appendChild(item);
      });

      this.uiContainer.appendChild(list);
    }

    // Add new spawner button
    const addButton = document.createElement('button');
    addButton.textContent = 'Add New Spawner';
    addButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    addButton.onclick = () => {
      this.editSpawner(-1);
    };
    this.uiContainer.appendChild(addButton);

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    backButton.onclick = () => {
      this.scene.enterDefaultMode();
    };
    this.uiContainer.appendChild(backButton);

    document.body.appendChild(this.uiContainer);
  }

  private editSpawner(index: number): void {
    this.selectedSpawnerIndex = index;
    this.destroyUI();
    this.createEditUI();
  }

  private createEditUI(): void {
    const isNew = this.selectedSpawnerIndex === -1;
    const spawner = isNew ? { eventName: '', enemyIds: [], spawnDelayMs: 1000 } : this.spawners[this.selectedSpawnerIndex];

    const gameScene = this.scene.scene.get('game') as GameScene;
    const levelData = gameScene.getLevelData();

    // Get available event names from triggers
    const availableEvents = new Set<string>();
    if (levelData.triggers) {
      for (const trigger of levelData.triggers) {
        availableEvents.add(trigger.eventName);
      }
    }

    // Get available enemy IDs
    const availableEnemyIds = new Set<string>();
    if (levelData.throwers) {
      for (const thrower of levelData.throwers) {
        if (thrower.id) availableEnemyIds.add(thrower.id);
      }
    }

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
      max-width: 400px;
      pointer-events: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = isNew ? 'Add Spawner' : 'Edit Spawner';
    title.style.marginTop = '0';
    this.uiContainer.appendChild(title);

    // Event name dropdown
    const eventLabel = document.createElement('label');
    eventLabel.textContent = 'Event Name:';
    eventLabel.style.display = 'block';
    eventLabel.style.marginTop = '10px';
    this.uiContainer.appendChild(eventLabel);

    const eventSelect = document.createElement('select');
    eventSelect.style.cssText = `
      width: 100%;
      padding: 5px;
      margin: 5px 0;
      font-family: monospace;
    `;

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Select Event --';
    eventSelect.appendChild(emptyOption);

    for (const eventName of Array.from(availableEvents).sort()) {
      const option = document.createElement('option');
      option.value = eventName;
      option.textContent = eventName;
      if (eventName === spawner.eventName) {
        option.selected = true;
      }
      eventSelect.appendChild(option);
    }

    this.uiContainer.appendChild(eventSelect);

    // Enemy IDs multi-select
    const idsLabel = document.createElement('label');
    idsLabel.textContent = 'Enemy IDs:';
    idsLabel.style.display = 'block';
    idsLabel.style.marginTop = '10px';
    this.uiContainer.appendChild(idsLabel);

    const idsContainer = document.createElement('div');
    idsContainer.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #666;
      padding: 5px;
      margin: 5px 0;
      background: rgba(255,255,255,0.1);
    `;

    const selectedIds = new Set(spawner.enemyIds);

    for (const enemyId of Array.from(availableEnemyIds).sort()) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = enemyId;
      checkbox.checked = selectedIds.has(enemyId);
      checkbox.id = `enemy-${enemyId}`;

      const label = document.createElement('label');
      label.htmlFor = `enemy-${enemyId}`;
      label.textContent = enemyId;
      label.style.cssText = `
        display: block;
        padding: 5px;
        cursor: pointer;
      `;
      label.prepend(checkbox);

      idsContainer.appendChild(label);
    }

    this.uiContainer.appendChild(idsContainer);

    // Spawn delay input
    const delayLabel = document.createElement('label');
    delayLabel.textContent = 'Spawn Delay (ms):';
    delayLabel.style.display = 'block';
    delayLabel.style.marginTop = '10px';
    this.uiContainer.appendChild(delayLabel);

    const delayInput = document.createElement('input');
    delayInput.type = 'number';
    delayInput.value = spawner.spawnDelayMs.toString();
    delayInput.style.cssText = `
      width: 100%;
      padding: 5px;
      margin: 5px 0;
      font-family: monospace;
    `;
    delayInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.uiContainer.appendChild(delayInput);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    saveButton.onclick = () => {
      const eventName = eventSelect.value.trim();
      const checkboxes = idsContainer.querySelectorAll('input[type="checkbox"]:checked');
      const enemyIds = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);
      const spawnDelayMs = Number.parseInt(delayInput.value, 10);

      if (!eventName || enemyIds.length === 0 || Number.isNaN(spawnDelayMs)) {
        alert('Please select event, at least one enemy, and valid delay');
        return;
      }

      const newSpawner: LevelSpawner = { eventName, enemyIds, spawnDelayMs };

      levelData.spawners ??= [];

      if (isNew) {
        levelData.spawners.push(newSpawner);
      } else {
        levelData.spawners[this.selectedSpawnerIndex] = newSpawner;
      }

      this.destroyUI();
      this.selectedSpawnerIndex = -1;
      this.spawners = levelData.spawners;

      this.createUI();
    };
    this.uiContainer.appendChild(saveButton);

    // Delete button (only for existing spawners)
    if (!isNew) {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.style.cssText = `
        padding: 10px 20px;
        margin: 10px 5px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
      `;
      deleteButton.onclick = () => {
        levelData.spawners?.splice(this.selectedSpawnerIndex, 1);

        this.destroyUI();
        this.selectedSpawnerIndex = -1;
        this.spawners = levelData.spawners ?? [];
        this.createUI();
      };
      this.uiContainer.appendChild(deleteButton);
    }

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      margin: 10px 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    backButton.onclick = () => {
      this.destroyUI();
      this.selectedSpawnerIndex = -1;
      this.spawners = levelData.spawners ?? [];
      this.createUI();
    };
    this.uiContainer.appendChild(backButton);

    document.body.appendChild(this.uiContainer);
  }

  protected destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = undefined;
    }
  }
}
