import { WorldStateManager } from './WorldStateManager';
import { EscortPersistence } from '../ecs/components/escort/EscortPersistence';
import { EscortSpawnManager } from './escort/EscortSpawnManager';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { InputComponent } from '../ecs/components/input/InputComponent';
import { PLAYER_MAX_HEALTH } from '../ecs/entities/player/PlayerEntity';
import type GameScene from '../scenes/GameScene';

const ESCORT_FOLLOW_THRESHOLD_PX = 200;
const FADE_DURATION_MS = 500;

/**
 * Owns the level transition flow:
 *   - start(target, col, row): save state → fade out → load target level
 *   - reload():                restore from level-entry snapshot, then transition to current level
 *
 * Extracted from GameScene to keep transition concerns isolated.
 * The static previousEntityManager handoff still lives on GameScene
 * because LoadingScene reads it after this class is gone.
 */
export class LevelTransitionManager {
  constructor(private readonly scene: GameScene) {}

  /** Start a level transition: save world state, fade out, hand off to LoadingScene. */
  start(targetLevel: string, spawnCol: number, spawnRow: number): void {
    console.log('[DBGAME] Transition to:', targetLevel);
    const worldState = WorldStateManager.getInstance();

    this.savePlayerStateForTransition(worldState);
    worldState.updateModifiedCells(this.scene.getCurrentLevelName(), this.scene.getGrid(), this.scene.getLevelData());
    worldState.updateTimePlayed();
    this.persistEscortAcrossTransition(worldState);

    worldState.setCurrentLevel(targetLevel);
    worldState.setPlayerSpawnPosition(spawnCol, spawnRow);
    void worldState.saveToFile();

    this.handOffToLoadingScene(targetLevel, spawnCol, spawnRow);
  }

  /** Reload the current level: restore entry snapshot (preserving active escort) then transition. */
  reload(): void {
    const worldState = WorldStateManager.getInstance();
    const escortSnapshot = this.captureActiveEscortState();

    new EscortSpawnManager(
      this.scene,
      this.scene.getGrid(),
      this.scene.getEntityManager(),
      this.scene.eventManager,
    ).handleDeathReset(this.scene.getCurrentLevelName());

    this.restoreEntrySnapshot(worldState);
    this.reapplyEscortState(worldState, escortSnapshot);

    const state = worldState.getState();
    const levelData = this.scene.getLevelData();
    const spawnCol = state.player.spawnCol ?? levelData.playerStart.x;
    const spawnRow = state.player.spawnRow ?? levelData.playerStart.y;

    this.start(this.scene.getCurrentLevelName(), spawnCol, spawnRow);
  }

  // ─── start() helpers ─────────────────────────────────────────────

  private savePlayerStateForTransition(worldState: WorldStateManager): void {
    const player = this.scene.getEntityManager().getFirst('player');
    if (!player) return;

    const health = player.get(HealthComponent);
    if (health && health.getHealth() > 0) {
      worldState.setPlayerHealth(health.getHealth());
    }

    const input = player.get(InputComponent);
    input?.setEnabled(false);
  }

  private persistEscortAcrossTransition(worldState: WorldStateManager): void {
    const persistence = new EscortPersistence();
    const escortId = persistence.getCurrentEscortId();
    if (!escortId) return;

    const player = this.scene.getEntityManager().getFirst('player');
    if (!player) return;

    const escortEntity = this.scene.getEntityManager().getAll().find(e => e.id === escortId);
    if (!escortEntity) return;

    const escortT = escortEntity.get(TransformComponent);
    const playerT = player.get(TransformComponent);
    if (!escortT || !playerT) return;

    const grid = this.scene.getGrid();
    const currentLevelName = this.scene.getCurrentLevelName();

    // Always save escort position in current level
    const escortCell = grid.worldToCell(escortT.x, escortT.y);
    worldState.updateMovedEntity(currentLevelName, escortId, escortCell.col, escortCell.row);

    const dist = Math.hypot(playerT.x - escortT.x, playerT.y - escortT.y);
    if (dist > ESCORT_FOLLOW_THRESHOLD_PX) {
      // Too far — escort stays in this level
      persistence.setLeftInLevel(escortId, currentLevelName);
    } else {
      // Close enough — escort follows, clear stale position data
      persistence.clearLeftInLevel(escortId);
      worldState.removeMovedEntity(currentLevelName, escortId);
    }
  }

  private handOffToLoadingScene(targetLevel: string, spawnCol: number, spawnRow: number): void {
    // Save entity manager for cleanup BEFORE fade
    const entityManager = this.scene.getEntityManager();
    console.log('[DBGAME] Saving', entityManager.count, 'entities for cleanup');
    this.scene.savePreviousEntityManager(entityManager);

    console.log('[DBGAME] Starting fade out');
    this.scene.cameras.main.fadeOut(FADE_DURATION_MS, 0, 0, 0);

    // Use timeout instead of callback (more reliable)
    const previousLevel = this.scene.getCurrentLevelName();
    this.scene.time.delayedCall(FADE_DURATION_MS, () => {
      console.log('[DBGAME] Fade complete (timeout), starting LoadingScene');
      this.scene.scene.start('LoadingScene', {
        targetLevel,
        targetCol: spawnCol,
        targetRow: spawnRow,
        previousLevel,
      });
    });
  }

  // ─── reload() helpers ────────────────────────────────────────────

  private captureActiveEscortState(): {
    escortId: string | null;
    escortPos: { col: number; row: number } | null;
    escortFlags: Array<[string, string]>;
  } {
    const persistence = new EscortPersistence();
    const escortId = persistence.getCurrentEscortId();
    let escortPos: { col: number; row: number } | null = null;
    const escortFlags: Array<[string, string]> = [];
    if (!escortId) return { escortId: null, escortPos, escortFlags };

    const escortEntity = this.scene.getEntityManager().getAll().find(e => e.id === escortId);
    if (escortEntity) {
      const t = escortEntity.get(TransformComponent);
      if (t) {
        const cell = this.scene.getGrid().worldToCell(t.x, t.y);
        escortPos = { col: cell.col, row: cell.row };
      }
    }
    escortFlags.push(...persistence.getDefinitionFlagEntries(escortId));
    return { escortId, escortPos, escortFlags };
  }

  private restoreEntrySnapshot(worldState: WorldStateManager): void {
    const snapshot = this.scene.getLevelEntrySnapshot();
    if (snapshot) {
      worldState.loadFromJSON(snapshot);
    } else {
      worldState.setPlayerHealth(PLAYER_MAX_HEALTH);
    }
  }

  private reapplyEscortState(
    worldState: WorldStateManager,
    snapshot: ReturnType<LevelTransitionManager['captureActiveEscortState']>,
  ): void {
    if (!snapshot.escortId) return;
    const persistence = new EscortPersistence();
    persistence.setCurrentEscortId(snapshot.escortId);
    persistence.restoreFlags(snapshot.escortFlags);
    if (snapshot.escortPos) {
      worldState.updateMovedEntity(
        this.scene.getCurrentLevelName(),
        snapshot.escortId,
        snapshot.escortPos.col,
        snapshot.escortPos.row,
      );
    }
  }
}
