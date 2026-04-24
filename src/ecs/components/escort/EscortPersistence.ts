import { WorldStateManager } from '../../../systems/WorldStateManager';

export type EscortDefinitionProps = {
  readonly escortType: string;
  readonly originLevel: string;
  readonly destinationLevel: string;
  readonly destinationCol: number;
  readonly destinationRow: number;
  readonly reachDistance: number;
  readonly followSpeed: number;
  readonly followToLevels: string[];
  readonly enemyDetectDistancePx: number;
  readonly scale?: number;
  readonly shadowScale?: number;
  readonly shadowOffsetX?: number;
  readonly shadowOffsetY?: number;
};

const DEFINITION_KEYS = [
  'type', 'origin_level', 'destination_level', 'destination_col',
  'destination_row', 'reach_distance', 'follow_speed', 'follow_to_levels', 'enemy_detect_px',
  'scale', 'shadow_scale', 'shadow_offset_x', 'shadow_offset_y',
] as const;

const CLEAR_KEYS = [...DEFINITION_KEYS, 'left_in_level'] as const;

export class EscortPersistence {
  private readonly ws = WorldStateManager.getInstance();

  private key(id: string, suffix: string): string {
    return `escort_${id}_${suffix}`;
  }

  // --- Global: current_escort ---

  getCurrentEscortId(): string { return this.ws.getFlag('current_escort') ?? ''; }
  setCurrentEscortId(id: string): void { this.ws.setFlag('current_escort', id); }
  clearCurrentEscort(): void { this.ws.setFlag('current_escort', ''); }

  // --- Per-escort reads ---

  getType(id: string): string { return this.ws.getFlag(this.key(id, 'type')) ?? 'knight'; }
  getDestinationLevel(id: string): string { return this.ws.getFlag(this.key(id, 'destination_level')) ?? ''; }
  getDestinationCol(id: string): number { return Number(this.ws.getFlag(this.key(id, 'destination_col')) ?? '0'); }
  getDestinationRow(id: string): number { return Number(this.ws.getFlag(this.key(id, 'destination_row')) ?? '0'); }
  getReachDistance(id: string): number { return Number(this.ws.getFlag(this.key(id, 'reach_distance')) ?? '15'); }
  getFollowSpeed(id: string): number { return Number(this.ws.getFlag(this.key(id, 'follow_speed')) ?? '200'); }
  getFollowToLevels(id: string): string[] {
    const str = this.ws.getFlag(this.key(id, 'follow_to_levels'));
    return str ? str.split(',') : [];
  }
  getEnemyDetectDistancePx(id: string): number { return Number(this.ws.getFlag(this.key(id, 'enemy_detect_px')) ?? '128'); }
  getScale(id: string): number | undefined {
    const v = this.ws.getFlag(this.key(id, 'scale'));
    return v ? Number(v) : undefined;
  }
  getShadowScale(id: string): number | undefined {
    const v = this.ws.getFlag(this.key(id, 'shadow_scale'));
    return v ? Number(v) : undefined;
  }
  getShadowOffsetX(id: string): number | undefined {
    const v = this.ws.getFlag(this.key(id, 'shadow_offset_x'));
    return v ? Number(v) : undefined;
  }
  getShadowOffsetY(id: string): number | undefined {
    const v = this.ws.getFlag(this.key(id, 'shadow_offset_y'));
    return v ? Number(v) : undefined;
  }

  getOriginLevel(id: string): string { return this.ws.getFlag(this.key(id, 'origin_level')) ?? ''; }

  getLeftInLevel(id: string): string { return this.ws.getFlag(this.key(id, 'left_in_level')) ?? ''; }
  setLeftInLevel(id: string, level: string): void { this.ws.setFlag(this.key(id, 'left_in_level'), level); }
  clearLeftInLevel(id: string): void { this.ws.setFlag(this.key(id, 'left_in_level'), ''); }

  isCompleted(id: string): boolean { return this.ws.getFlag(this.key(id, 'completed')) === 'true'; }
  getCompletedLevel(id: string): string { return this.ws.getFlag(this.key(id, 'completed_level')) ?? ''; }
  getCompletedCol(id: string): number { return Number(this.ws.getFlag(this.key(id, 'completed_col')) ?? '0'); }
  getCompletedRow(id: string): number { return Number(this.ws.getFlag(this.key(id, 'completed_row')) ?? '0'); }

  // --- Bulk writes ---

  persistDefinition(id: string, props: EscortDefinitionProps): void {
    this.ws.setFlag(this.key(id, 'type'), props.escortType);
    this.ws.setFlag(this.key(id, 'origin_level'), props.originLevel);
    this.ws.setFlag(this.key(id, 'destination_level'), props.destinationLevel);
    this.ws.setFlag(this.key(id, 'destination_col'), String(props.destinationCol));
    this.ws.setFlag(this.key(id, 'destination_row'), String(props.destinationRow));
    this.ws.setFlag(this.key(id, 'reach_distance'), String(props.reachDistance));
    this.ws.setFlag(this.key(id, 'follow_speed'), String(props.followSpeed));
    this.ws.setFlag(this.key(id, 'follow_to_levels'), props.followToLevels.join(','));
    this.ws.setFlag(this.key(id, 'enemy_detect_px'), String(props.enemyDetectDistancePx));
    if (props.scale !== undefined) this.ws.setFlag(this.key(id, 'scale'), String(props.scale));
    if (props.shadowScale !== undefined) this.ws.setFlag(this.key(id, 'shadow_scale'), String(props.shadowScale));
    if (props.shadowOffsetX !== undefined) this.ws.setFlag(this.key(id, 'shadow_offset_x'), String(props.shadowOffsetX));
    if (props.shadowOffsetY !== undefined) this.ws.setFlag(this.key(id, 'shadow_offset_y'), String(props.shadowOffsetY));
  }

  markCompleted(id: string, level: string, col: number, row: number): void {
    this.ws.setFlag(this.key(id, 'left_in_level'), '');
    this.ws.setFlag(this.key(id, 'completed'), 'true');
    this.ws.setFlag(this.key(id, 'completed_level'), level);
    this.ws.setFlag(this.key(id, 'completed_col'), String(col));
    this.ws.setFlag(this.key(id, 'completed_row'), String(row));
  }

  clearFlags(id: string): void {
    for (const k of CLEAR_KEYS) {
      this.ws.setFlag(this.key(id, k), '');
    }
  }

  // --- Helpers for reload (preserving flags) ---

  getDefinitionFlagEntries(id: string): Array<[string, string]> {
    const entries: Array<[string, string]> = [];
    for (const k of DEFINITION_KEYS) {
      const val = this.ws.getFlag(this.key(id, k));
      if (val) entries.push([this.key(id, k), val]);
    }
    return entries;
  }

  restoreFlags(entries: Array<[string, string]>): void {
    for (const [flagKey, val] of entries) {
      this.ws.setFlag(flagKey, val);
    }
  }

  getCompletedEscortIds(): string[] {
    const flags = this.ws.getState().flags;
    const ids: string[] = [];
    for (const key of Object.keys(flags)) {
      if (key.startsWith('escort_') && key.endsWith('_completed') && flags[key] === 'true') {
        ids.push(key.slice('escort_'.length, -'_completed'.length));
      }
    }
    return ids;
  }

  clearDefinitionFlags(id: string): void {
    for (const k of DEFINITION_KEYS) {
      this.ws.setFlag(this.key(id, k), '');
    }
  }
}
