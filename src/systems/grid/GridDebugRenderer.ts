/**
 * Handles all grid debug visualization — extracted from Grid data model.
 */
import type { Grid } from './Grid';
import type { BlockedAreaManager } from '../BlockedAreaManager';
import type { LevelData } from '../level/LevelLoader';
import { GridPositionComponent } from '../../ecs/components/movement/GridPositionComponent';
import type { EntityManager } from '../../ecs/EntityManager';
import { getMustFaceEnemy } from '../../ecs/components/combat/AttackComboComponent';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { WalkComponent } from '../../ecs/components/movement/WalkComponent';
import { ProjectileEmitterComponent } from '../../ecs/components/combat/ProjectileEmitterComponent';
import { Depth } from '../../constants/DepthConstants';

export class GridDebugRenderer {
  private collisionBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  private emitterBoxes: Array<{ x: number; y: number; size: number }> = [];

  constructor(
    private readonly grid: Grid,
    private readonly graphics: Phaser.GameObjects.Graphics,
    private readonly scene: Phaser.Scene,
  ) {}

  renderGridDebug(levelData?: LevelData, blockedAreaManager?: BlockedAreaManager): void {
    const cellSize = this.grid.cellSize;

    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const x = col * cellSize;
        const y = row * cellSize;
        const cell = this.grid.getCell(col, row);
        const layer = cell?.layer ?? 0;

        let layerAlpha: number;
        let layerColor: number;

        if (layer < 0) {
          layerAlpha = 0.25;
          layerColor = 0xffffff;
        } else if (layer === 0) {
          layerAlpha = 0.1;
          layerColor = 0x808080;
        } else {
          layerAlpha = 0.3 + (layer * 0.1);
          layerColor = 0x000000;
        }

        this.graphics.fillStyle(layerColor, layerAlpha);
        this.graphics.fillRect(x, y, cellSize, cellSize);
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
      }
    }

    // Trigger cells with yellow outline
    if (levelData?.triggers) {
      for (const trigger of levelData.triggers) {
        for (const cell of trigger.triggerCells) {
          const worldPos = this.grid.cellToWorld(cell.col, cell.row);
          this.graphics.lineStyle(3, 0xffff00, 1);
          this.graphics.strokeRect(worldPos.x, worldPos.y, cellSize, cellSize);
        }
      }
    }

    // Blocked cells with black outline
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const cell = this.grid.getCell(col, row);
        if (cell?.properties.has('blocked')) {
          const worldPos = this.grid.cellToWorld(col, row);
          this.graphics.lineStyle(3, 0x000000, 1);
          this.graphics.strokeRect(worldPos.x, worldPos.y, cellSize, cellSize);
        }
      }
    }

    // Blocked area polygons
    this.renderBlockedAreas(blockedAreaManager);

    // Player currentCell highlight (green)
    const playerEntities = this.grid.getEntitiesWithTag('player');
    if (playerEntities.length > 0) {
      const playerGridPos = playerEntities[0].get(GridPositionComponent);
      if (playerGridPos) {
        const playerWorldPos = this.grid.cellToWorld(playerGridPos.currentCell.col, playerGridPos.currentCell.row);
        this.graphics.lineStyle(3, 0x00ff00, 1);
        this.graphics.strokeRect(playerWorldPos.x, playerWorldPos.y, cellSize, cellSize);
      }
    }
  }

  renderSceneDebug(entityManager?: EntityManager): void {
    this.renderPunchFOV(entityManager);

    this.collisionBoxes.forEach(box => {
      this.graphics.lineStyle(2, 0x0000ff, 1);
      this.graphics.strokeRect(box.x, box.y, box.width, box.height);
    });

    this.emitterBoxes.forEach(box => {
      this.graphics.fillStyle(0xff0000, 0.5);
      this.graphics.fillRect(box.x - box.size / 2, box.y - box.size / 2, box.size, box.size);
    });

    if (entityManager) {
      const player = entityManager.getFirst('player');
      if (player) {
        const emitter = player.get(ProjectileEmitterComponent);
        if (emitter) {
          const pos = emitter.getEmitterPosition();
          this.graphics.fillStyle(0xff0000, 0.5);
          this.graphics.fillRect(pos.x - 10, pos.y - 10, 20, 20);
        }
      }
    }

    this.collisionBoxes = [];
    this.emitterBoxes = [];
  }

  renderCollisionBox(x: number, y: number, width: number, height: number): void {
    this.collisionBoxes.push({ x, y, width, height });
  }

  renderEmitterBox(x: number, y: number, size: number): void {
    this.emitterBoxes.push({ x, y, size });
  }

  renderCellCoordinates(): void {
    for (let row = 0; row < this.grid.height; row++) {
      for (let col = 0; col < this.grid.width; col++) {
        const x = col * this.grid.cellSize + 2;
        const y = row * this.grid.cellSize + 10;

        this.graphics.fillStyle(0xffffff, 0.5);
        this.graphics.fillRect(x, y - 8, 30, 10);

        const text = this.scene.add.text(x + 1, y - 7, `${col},${row}`, {
          fontSize: '8px',
          color: '#000000'
        });
        text.setDepth(Depth.debugText);

        this.scene.time.delayedCall(0, () => text.destroy());
      }
    }
  }

  private renderPunchFOV(entityManager?: EntityManager): void {
    if (!entityManager) return;
    if (!getMustFaceEnemy()) return;

    const player = entityManager.getFirst('player');
    if (!player) return;

    const transform = player.get(TransformComponent);
    const walk = player.get(WalkComponent);
    if (!transform || !walk) return;

    const facingAngle = Math.atan2(walk.lastMoveY, walk.lastMoveX);
    const fovAngle = Math.PI * 0.6;
    const range = 128;

    this.graphics.lineStyle(2, 0xffff00, 0.5);
    this.graphics.beginPath();
    this.graphics.moveTo(transform.x, transform.y);

    const leftAngle = facingAngle - fovAngle / 2;
    const rightAngle = facingAngle + fovAngle / 2;

    this.graphics.lineTo(
      transform.x + Math.cos(leftAngle) * range,
      transform.y + Math.sin(leftAngle) * range
    );
    this.graphics.moveTo(transform.x, transform.y);
    this.graphics.lineTo(
      transform.x + Math.cos(rightAngle) * range,
      transform.y + Math.sin(rightAngle) * range
    );

    this.graphics.strokePath();

    this.graphics.lineStyle(1, 0xffff00, 0.3);
    this.graphics.beginPath();
    this.graphics.arc(transform.x, transform.y, range, leftAngle, rightAngle);
    this.graphics.strokePath();
  }

  private renderBlockedAreas(blockedAreaManager?: BlockedAreaManager): void {
    if (!blockedAreaManager) return;
    const areas = blockedAreaManager.getAll();
    for (const area of areas) {
      let color = 0x00ff00;
      if (area.layer === 0) color = 0xff0000;
      else if (area.layer === 1) color = 0x0000ff;

      this.graphics.fillStyle(color, 0.15);
      this.graphics.beginPath();
      this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
      for (let i = 1; i < area.vertices.length; i++) {
        this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.fillPath();

      this.graphics.lineStyle(2, color, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(area.vertices[0].x, area.vertices[0].y);
      for (let i = 1; i < area.vertices.length; i++) {
        this.graphics.lineTo(area.vertices[i].x, area.vertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    }
  }
}
