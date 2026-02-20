import { EditorState } from './EditorState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { PatrolComponent } from '../ecs/components/ai/PatrolComponent';
import type { IStateEnterProps } from '../systems/state/IState';

export class EditEntityEditorState extends EditorState {
  private entity: Entity | null = null;
  private commonPanel: HTMLDivElement | null = null;
  private entityPanel: HTMLDivElement | null = null;
  private waypointMarkers: Phaser.GameObjects.Container[] = [];
  private draggingWaypointIndex: number | null = null;

  onEnter(props?: IStateEnterProps<void>): void {
    this.entity = (props as IStateEnterProps<Entity> | undefined)?.data ?? null;
    this.createUI();
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  onExit(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.destroyUI();
  }

  private createUI(): void {
    if (!this.entity) return;

    this.createCommonPanel();
    this.createEntitySpecificPanel();
    
    // Render waypoints if robot
    if (this.entity.id.startsWith('stalking_robot') || this.entity.id.startsWith('robot')) {
      this.renderWaypoints();
    }
  }

  private createCommonPanel(): void {
    this.commonPanel = document.createElement('div');
    this.commonPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    backButton.onclick = () => this.scene.enterDefaultMode();
    this.commonPanel.appendChild(backButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
    `;
    deleteButton.onclick = () => {
      if (this.entity && confirm('Delete this entity?')) {
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        
        if (levelData.entities) {
          levelData.entities = levelData.entities.filter(e => e.id !== this.entity!.id);
        }
        
        this.entity.destroy();
        gameScene.resetScene();
        this.scene.enterDefaultMode();
      }
    };
    this.commonPanel.appendChild(deleteButton);

    const eventLabel = document.createElement('div');
    eventLabel.textContent = 'Spawn Event:';
    eventLabel.style.cssText = 'margin-top: 10px; margin-bottom: 5px; font-size: 14px;';
    this.commonPanel.appendChild(eventLabel);

    const eventInput = document.createElement('input');
    eventInput.type = 'text';
    eventInput.placeholder = 'Leave empty for immediate spawn';
    eventInput.style.cssText = `
      width: 200px;
      padding: 5px;
      font-family: monospace;
      margin-bottom: 5px;
    `;
    eventInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
    
    if (this.entity) {
      const levelData = (this.scene.scene.get('game') as import('../scenes/GameScene').default).getLevelData();
      const entityData = levelData.entities?.find(e => e.id === this.entity!.id);
      if (entityData?.createOnEvent) {
        eventInput.value = entityData.createOnEvent;
      }
    }
    
    eventInput.addEventListener('input', () => {
      if (this.entity) {
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        const entityData = levelData.entities?.find(e => e.id === this.entity!.id);
        if (entityData) {
          if (eventInput.value.trim()) {
            entityData.createOnEvent = eventInput.value.trim();
          } else {
            delete entityData.createOnEvent;
          }
        }
      }
    });
    
    this.commonPanel.appendChild(eventInput);

    document.body.appendChild(this.commonPanel);
  }

  private createEntitySpecificPanel(): void {
    if (!this.entity) return;

    this.entityPanel = document.createElement('div');
    this.entityPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: monospace;
      z-index: 10000;
    `;

    const entityType = this.getEntityType();
    const title = document.createElement('h3');
    title.textContent = `Edit ${entityType}`;
    title.style.marginTop = '0';
    this.entityPanel.appendChild(title);

    // Add entity-specific content
    if (entityType === 'Skeleton' || entityType === 'Thrower' || entityType === 'Bullet Dude' || entityType === 'Bug Base') {
      this.addDifficultyControls();
    } else if (entityType === 'Robot') {
      this.addDifficultyControls();
      this.addWaypointControls();
    }

    document.body.appendChild(this.entityPanel);
  }

  private getEntityType(): string {
    if (!this.entity) return 'Unknown';
    
    if (this.entity.id.startsWith('skeleton')) return 'Skeleton';
    if (this.entity.id.startsWith('thrower')) return 'Thrower';
    if (this.entity.id.startsWith('stalking_robot') || this.entity.id.startsWith('robot')) return 'Robot';
    if (this.entity.id.startsWith('bug_base') || this.entity.id.startsWith('bugbase')) return 'Bug Base';
    if (this.entity.id.startsWith('bullet_dude') || this.entity.id.startsWith('bulletdude')) return 'Bullet Dude';
    
    return 'Unknown';
  }

  private addDifficultyControls(): void {
    if (!this.entityPanel || !this.entity) return;

    const difficulty = this.entity.get(DifficultyComponent);
    if (!difficulty) return;

    const diffLabel = document.createElement('div');
    diffLabel.textContent = `Difficulty: ${difficulty.difficulty}`;
    diffLabel.style.marginTop = '10px';
    diffLabel.style.marginBottom = '10px';
    this.entityPanel.appendChild(diffLabel);

    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    difficulties.forEach(diff => {
      const button = document.createElement('button');
      button.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      button.style.cssText = `
        padding: 10px 20px;
        margin: 5px;
        background: ${difficulty.difficulty === diff ? '#4CAF50' : '#666'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
      `;
      button.onclick = () => {
        if (this.entity) {
          const diffComp = this.entity.get(DifficultyComponent);
          if (diffComp) {
            (diffComp as { difficulty: string }).difficulty = diff;
            
            // Update level data
            const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
            const levelData = gameScene.getLevelData();
            const entityDef = levelData.entities?.find(e => e.id === this.entity!.id);
            if (entityDef && entityDef.data) {
              (entityDef.data as { difficulty: string }).difficulty = diff;
            }
            
            this.destroyUI();
            this.createUI();
          }
        }
      };
      this.entityPanel?.appendChild(button);
    });
  }

  private addWaypointControls(): void {
    if (!this.entityPanel || !this.entity) return;

    const patrol = this.entity.get(PatrolComponent);
    if (!patrol) return;

    const waypointLabel = document.createElement('div');
    waypointLabel.textContent = 'Waypoints:';
    waypointLabel.style.marginTop = '20px';
    waypointLabel.style.fontWeight = 'bold';
    this.entityPanel.appendChild(waypointLabel);

    const waypointList = document.createElement('div');
    waypointList.style.cssText = 'margin: 10px 0; font-size: 12px;';
    
    patrol.waypoints.forEach((wp, index) => {
      const wpDiv = document.createElement('div');
      wpDiv.textContent = `${index + 1}. (${wp.col}, ${wp.row})`;
      wpDiv.style.padding = '2px 0';
      waypointList.appendChild(wpDiv);
    });
    
    this.entityPanel.appendChild(waypointList);

    const addButton = document.createElement('button');
    addButton.textContent = 'Add Waypoint';
    addButton.style.cssText = `
      padding: 8px 15px;
      margin: 5px 5px 5px 0;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
    `;
    addButton.onclick = () => {
      const transform = this.entity!.get(TransformComponent);
      if (transform) {
        const grid = this.scene.getGrid();
        const cell = grid.worldToCell(transform.x, transform.y);
        patrol.waypoints.push({ col: cell.col, row: cell.row });
        
        // Update level data
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        const entityDef = levelData.entities?.find(e => e.id === this.entity!.id);
        if (entityDef && entityDef.data) {
          (entityDef.data as { waypoints: Array<{ col: number; row: number }> }).waypoints = patrol.waypoints;
        }
        
        this.destroyUI();
        this.createUI();
      }
    };
    this.entityPanel.appendChild(addButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Last';
    deleteButton.style.cssText = `
      padding: 8px 15px;
      margin: 5px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
    `;
    deleteButton.onclick = () => {
      if (patrol.waypoints.length > 1) {
        patrol.waypoints.pop();
        
        // Update level data
        const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
        const levelData = gameScene.getLevelData();
        const entityDef = levelData.entities?.find(e => e.id === this.entity!.id);
        if (entityDef && entityDef.data) {
          (entityDef.data as { waypoints: Array<{ col: number; row: number }> }).waypoints = patrol.waypoints;
        }
        
        this.destroyUI();
        this.createUI();
      }
    };
    this.entityPanel.appendChild(deleteButton);
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.entity) return;

    const gameScene = this.scene.scene.get('game') as import('../scenes/GameScene').default;
    const hitObjects = gameScene.input.hitTestPointer(pointer);
    
    if (hitObjects.length > 0) {
      for (const obj of hitObjects) {
        if ((obj as { depth?: number }).depth && (obj as { depth?: number }).depth! >= 1000) {
          return;
        }
      }
    }

    const camera = gameScene.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    // Check for waypoint click
    const patrol = this.entity.get(PatrolComponent);
    if (patrol) {
      const grid = this.scene.getGrid();
      
      for (let i = 0; i < patrol.waypoints.length; i++) {
        const wp = patrol.waypoints[i];
        const wpWorldX = wp.col * grid.cellSize + grid.cellSize / 2;
        const wpWorldY = wp.row * grid.cellSize + grid.cellSize / 2;
        const distance = Math.hypot(worldX - wpWorldX, worldY - wpWorldY);
        
        if (distance < 30) {
          this.draggingWaypointIndex = i;
          return;
        }
      }
    }

    // Check for entity click to move
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    const distance = Math.hypot(worldX - transform.x, worldY - transform.y);
    if (distance < 64) {
      const returnState = this.getEntityType().toLowerCase().replace(' ', '');
      this.scene.enterMoveMode(this.entity, `edit${returnState}`);
    }
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.draggingWaypointIndex === null || !this.entity) return;

    const gameScene = this.scene.scene.get('game');
    const camera = gameScene.cameras.main;
    const grid = this.scene.getGrid();

    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;

    const cell = grid.worldToCell(worldX, worldY);
    const cellWorld = grid.cellToWorld(cell.col, cell.row);
    const centerX = cellWorld.x + grid.cellSize / 2;
    const centerY = cellWorld.y + grid.cellSize / 2;

    // Update marker position
    const marker = this.waypointMarkers[this.draggingWaypointIndex];
    if (marker) {
      marker.setPosition(centerX, centerY);
    }

    // Update waypoint data
    const patrol = this.entity.get(PatrolComponent);
    if (patrol) {
      patrol.waypoints[this.draggingWaypointIndex].col = cell.col;
      patrol.waypoints[this.draggingWaypointIndex].row = cell.row;
      
      // Update level data
      const levelData = (gameScene as import('../scenes/GameScene').default).getLevelData();
      const entityDef = levelData.entities?.find((e: { id: string }) => e.id === this.entity!.id);
      if (entityDef && entityDef.data) {
        (entityDef.data as { waypoints: Array<{ col: number; row: number }> }).waypoints = patrol.waypoints;
      }
    }
  };

  private readonly handlePointerUp = (): void => {
    this.draggingWaypointIndex = null;
  };

  protected destroyUI(): void {
    if (this.commonPanel) {
      this.commonPanel.remove();
      this.commonPanel = null;
    }
    if (this.entityPanel) {
      this.entityPanel.remove();
      this.entityPanel = null;
    }
    this.destroyWaypoints();
  }

  private renderWaypoints(): void {
    if (!this.entity) return;

    this.destroyWaypoints();

    const patrol = this.entity.get(PatrolComponent);
    if (!patrol) return;

    const gameScene = this.scene.scene.get('game');
    const grid = this.scene.getGrid();

    patrol.waypoints.forEach((waypoint, index) => {
      const worldX = waypoint.col * grid.cellSize + grid.cellSize / 2;
      const worldY = waypoint.row * grid.cellSize + grid.cellSize / 2;

      const container = gameScene.add.container(worldX, worldY);

      const circle = gameScene.add.circle(0, 0, 20, 0x00ffff, 0.8);
      circle.setStrokeStyle(2, 0xffffff);
      container.add(circle);

      const text = gameScene.add.text(0, 0, (index + 1).toString(), {
        fontSize: '20px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(text);

      container.setDepth(1000);
      this.waypointMarkers.push(container);
    });
  }

  private destroyWaypoints(): void {
    this.waypointMarkers.forEach(marker => marker.destroy());
    this.waypointMarkers = [];
  }

  onUpdate(_delta: number): void {
    // Intentionally empty
  }
}
