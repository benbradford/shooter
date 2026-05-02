import type { Entity } from '../../ecs/Entity';
import type { EntityManager } from '../../ecs/EntityManager';
import type { Grid } from '../grid/Grid';
import type { EventManagerSystem } from '../../ecs/systems/EventManagerSystem';
import type { EscortState } from '../../ecs/components/escort/EscortComponent';
import { TransformComponent } from '../../ecs/components/core/TransformComponent';
import { EscortPersistence } from '../../ecs/components/escort/EscortPersistence';
import { WorldStateManager } from '../WorldStateManager';
import { createEscortEntity } from '../../ecs/entities/escort/EscortEntity';

export class EscortSpawnManager {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid,
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  spawnCrossLevelEscort(player: Entity, currentLevelName: string, playerStartCol: number, playerStartRow: number): void {
    const persistence = new EscortPersistence();
    const escortId = persistence.getCurrentEscortId();
    if (!escortId) return;

    if (this.entityManager.getAll().find(e => e.id === escortId)) return;

    const allowedLevels = persistence.getFollowToLevels(escortId);
    if (allowedLevels.length === 0 || !allowedLevels.includes(currentLevelName)) return;

    const leftInLevel = persistence.getLeftInLevel(escortId);
    if (leftInLevel && leftInLevel !== currentLevelName) return;

    let spawnCol: number;
    let spawnRow: number;
    let initialState: EscortState;

    if (leftInLevel === currentLevelName) {
      const ws = WorldStateManager.getInstance();
      const levelState = ws.getLevelState(currentLevelName);
      const moved = levelState.movedEntities?.find(e => e.id === escortId);
      spawnCol = moved?.col ?? playerStartCol;
      spawnRow = moved?.row ?? playerStartRow;
      initialState = 'following' as EscortState;
    } else {
      const ws = WorldStateManager.getInstance();
      const spawnPos = ws.getPlayerSpawnPosition();
      spawnCol = spawnPos.col ?? playerStartCol;
      spawnRow = spawnPos.row ?? playerStartRow;
      initialState = 'waiting_for_player_move' as EscortState;
    }

    const escort = createEscortEntity({
      scene: this.scene,
      grid: this.grid,
      entityId: escortId,
      col: spawnCol,
      row: spawnRow,
      playerEntity: player,
      entityManager: this.entityManager,
      eventManager: this.eventManager,
      escortType: persistence.getType(escortId),
      awakeOnEvent: '',
      destinationLevel: persistence.getDestinationLevel(escortId),
      destinationCol: persistence.getDestinationCol(escortId),
      destinationRow: persistence.getDestinationRow(escortId),
      reachDistance: persistence.getReachDistance(escortId),
      followSpeed: persistence.getFollowSpeed(escortId),
      followToLevels: allowedLevels,
      enemyDetectDistancePx: persistence.getEnemyDetectDistancePx(escortId),
      initialState,
      currentLevelName,
      scale: persistence.getScale(escortId),
      shadowScale: persistence.getShadowScale(escortId),
      shadowOffsetX: persistence.getShadowOffsetX(escortId),
      shadowOffsetY: persistence.getShadowOffsetY(escortId),
    });
    this.entityManager.add(escort);
  }

  spawnCompletedEscorts(player: Entity, currentLevelName: string): void {
    const persistence = new EscortPersistence();

    for (const id of persistence.getCompletedEscortIds()) {
      if (persistence.getCompletedLevel(id) !== currentLevelName) continue;
      if (this.entityManager.getAll().find(e => e.id === id)) continue;

      const col = persistence.getCompletedCol(id);
      const row = persistence.getCompletedRow(id);

      const escort = createEscortEntity({
        scene: this.scene,
        grid: this.grid,
        entityId: id,
        col,
        row,
        playerEntity: player,
        entityManager: this.entityManager,
        eventManager: this.eventManager,
        escortType: persistence.getType(id),
        awakeOnEvent: '',
        destinationLevel: '',
        destinationCol: col,
        destinationRow: row,
        reachDistance: 0,
        followSpeed: 0,
        followToLevels: [],
        enemyDetectDistancePx: 0,
        initialState: 'completed' as EscortState,
        currentLevelName,
        scale: persistence.getScale(id),
        shadowScale: persistence.getShadowScale(id),
        shadowOffsetX: persistence.getShadowOffsetX(id),
        shadowOffsetY: persistence.getShadowOffsetY(id),
      });
      escort.require(TransformComponent).y -= 16;
      this.entityManager.add(escort);
    }
  }

  handleDeathReset(currentLevelName: string): void {
    const persistence = new EscortPersistence();
    const escortId = persistence.getCurrentEscortId();
    if (!escortId) return;

    if (persistence.getOriginLevel(escortId) === currentLevelName) {
      persistence.clearCurrentEscort();
      persistence.clearDefinitionFlags(escortId);
    }
  }
}
