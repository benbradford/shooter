import { type Vec2, isConvex, computeNormals, isPointInPolygon, ensureClockwise, triangulate } from '../math/PolygonUtils';
import { getOverlappingCells } from '../math/SATCollision';
import type { BlockedAreaDef } from './level/LevelLoader';
import type { Grid } from './grid/Grid';

export type BlockedArea = {
  readonly id: string;
  readonly vertices: ReadonlyArray<Vec2>;
  readonly normals: ReadonlyArray<Vec2>;
  readonly layer: number;
  readonly blocksProjectiles: boolean;
};

export class BlockedAreaManager {
  private readonly areas: BlockedArea[] = [];
  private readonly blockedCells: Set<string> = new Set();

  constructor(defs: BlockedAreaDef[], grid: Grid) {
    for (const def of defs) {
      const cwVertices = ensureClockwise(def.vertices);
      const parts = isConvex(cwVertices) ? [cwVertices] : triangulate(cwVertices);
      if (parts.length === 0) {
        console.error(`[BlockedAreaManager] Polygon ${def.id} could not be triangulated, skipping`);
        continue;
      }
      for (const part of parts) {
        const normals = computeNormals(part);
        if (!normals) continue;
        this.areas.push({
          id: def.id,
          vertices: part,
          normals,
          layer: def.layer,
          blocksProjectiles: def.blocksProjectiles,
        });
        for (const cell of getOverlappingCells(part, normals, grid.cellSize)) {
          this.blockedCells.add(`${cell.col},${cell.row}`);
        }
      }
    }
  }

  getAll(): readonly BlockedArea[] {
    return this.areas;
  }

  getForLayer(layer: number): readonly BlockedArea[] {
    return this.areas.filter(a => a.layer === layer);
  }

  isPointInside(x: number, y: number, layer: number): boolean {
    for (const area of this.areas) {
      if (area.layer !== layer) continue;
      if (!area.blocksProjectiles) continue;
      if (isPointInPolygon(x, y, area.vertices)) return true;
    }
    return false;
  }

  getBlockedCells(): ReadonlySet<string> {
    return this.blockedCells;
  }
}
