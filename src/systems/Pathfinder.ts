import type { GridReader, CellData } from './grid/Grid';
import { GridCellBlocker } from '../ecs/components/movement/GridCellBlocker';

type PathNode = {
  col: number;
  row: number;
  layer: number; // Current layer at this node
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost
  parent: PathNode | null;
}

export class Pathfinder {
  private readonly grid: GridReader;
  private readonly blockedAreaCells?: ReadonlySet<string>;
  allowWater = false;

  constructor(grid: GridReader, blockedAreaCells?: ReadonlySet<string>) {
    this.grid = grid;
    this.blockedAreaCells = blockedAreaCells;
  }

  findPath(
    startCol: number,
    startRow: number,
    goalCol: number,
    goalRow: number,
    currentLayer: number,
    allowLayerChanges: boolean = false,
    allowDiagonals: boolean = false,
    allowPlatformJumps: boolean = false
  ): Array<{ col: number; row: number }> | null {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      col: startCol,
      row: startRow,
      layer: currentLayer,
      g: 0,
      h: this.heuristic(startCol, startRow, goalCol, goalRow),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      if (current.col === goalCol && current.row === goalRow) {
        return this.reconstructPath(current);
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(`${current.col},${current.row},${current.layer}`);

      const neighbors = this.getNeighbors(current.col, current.row, current.layer, allowLayerChanges, allowDiagonals, allowPlatformJumps);
      for (const neighbor of neighbors) {
        const key = `${neighbor.col},${neighbor.row},${neighbor.layer}`;
        if (closedSet.has(key)) continue;

        const g = current.g + neighbor.cost;
        const h = this.heuristic(neighbor.col, neighbor.row, goalCol, goalRow);
        const f = g + h;

        const existingIndex = openSet.findIndex(n => 
          n.col === neighbor.col && n.row === neighbor.row && n.layer === neighbor.layer
        );
        if (existingIndex === -1) {
          openSet.push({
            col: neighbor.col,
            row: neighbor.row,
            layer: neighbor.layer,
            g,
            h,
            f,
            parent: current
          });
        } else if (g < openSet[existingIndex].g) {
          openSet[existingIndex].g = g;
          openSet[existingIndex].f = f;
          openSet[existingIndex].parent = current;
        }
      }
    }

    return null;
  }

  private heuristic(col1: number, row1: number, col2: number, row2: number): number {
    const dx = Math.abs(col1 - col2);
    const dy = Math.abs(row1 - row2);
    return Math.max(dx, dy);
  }

  private getNeighbors(col: number, row: number, currentLayer: number, allowLayerChanges: boolean, allowDiagonals: boolean, allowPlatformJumps: boolean): Array<{ col: number; row: number; layer: number; cost: number }> {
    const neighbors: Array<{ col: number; row: number; layer: number; cost: number }> = [];
    const currentCell = this.grid.getCell(col, row);
    if (!currentCell) return neighbors;

    const directions = [
      { col: 0, row: -1 }, // Up
      { col: 0, row: 1 },  // Down
      { col: -1, row: 0 }, // Left
      { col: 1, row: 0 },  // Right
    ];

    if (allowDiagonals && !this.grid.isTransition(currentCell)) {
      directions.push(
        { col: -1, row: -1 }, // Up-Left
        { col: 1, row: -1 },  // Up-Right
        { col: -1, row: 1 },  // Down-Left
        { col: 1, row: 1 }    // Down-Right
      );
    }

    for (const dir of directions) {
      const newCol = col + dir.col;
      const newRow = row + dir.row;
      const targetCell = this.grid.getCell(newCol, newRow);
      if (!targetCell) continue;

      const neighbor = this.getValidNeighbor(currentCell, targetCell, dir, currentLayer, newCol, newRow, allowLayerChanges, allowPlatformJumps);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  // eslint-disable-next-line complexity
  private getValidNeighbor(
    currentCell: CellData,
    targetCell: CellData,
    dir: { col: number; row: number },
    currentLayer: number,
    newCol: number,
    newRow: number,
    allowLayerChanges: boolean,
    allowPlatformJumps: boolean
  ): { col: number; row: number; layer: number; cost: number } | null {
    if (this.blockedAreaCells?.has(`${newCol},${newRow}`)) {
      return null;
    }

    for (const occupant of targetCell.occupants) {
      const entity = occupant as { get?: (type: typeof GridCellBlocker) => unknown };
      if (entity.get?.(GridCellBlocker)) {
        return null;
      }
    }

    const isDiagonal = dir.col !== 0 && dir.row !== 0;
    const isHorizontal = dir.col !== 0 && dir.row === 0;
    const targetLayer = this.grid.getLayer(targetCell);
    const currentCellLayer = this.grid.getLayer(currentCell);

    if (this.grid.isTransition(targetCell)) {
      return { col: newCol, row: newRow, layer: targetLayer + 1, cost: 1 };
    }

    if (this.grid.isTransition(currentCell)) {
      if (isHorizontal) {
        return null;
      }
      return { col: newCol, row: newRow, layer: targetLayer, cost: 1 };
    }

    // Block diagonal movement across layer boundaries
    if (isDiagonal && currentCellLayer !== targetLayer) {
      return null;
    }

    // Block diagonal movement if either adjacent cell blocks movement
    if (isDiagonal) {
      const currentCol = newCol - dir.col;
      const currentRow = newRow - dir.row;
      
      const sideCell1 = this.grid.getCell(newCol, currentRow);
      const sideCell2 = this.grid.getCell(currentCol, newRow);
      
      if (sideCell1 && this.grid.getLayer(sideCell1) !== currentLayer) {
        return null;
      }
      if (sideCell2 && this.grid.getLayer(sideCell2) !== currentLayer) {
        return null;
      }
    }

    // Block movement into water (unless bridge or canSwim)
    if (targetCell.properties.has('water') && !targetCell.properties.has('bridge')) {
      if (!this.allowWater) return null;
    }

    // Void cells: jump over (cardinal only) if landing cell is valid
    if (targetCell.properties.has('void')) {
      if (isDiagonal) return null;
      const landCol = newCol + dir.col;
      const landRow = newRow + dir.row;
      const landCell = this.grid.getCell(landCol, landRow);
      if (!landCell) return null;
      if (landCell.properties.has('void') || landCell.properties.has('wall') || landCell.properties.has('blocked')) return null;
      if (this.grid.getLayer(landCell) !== currentLayer) return null;
      for (const occupant of landCell.occupants) {
        const entity = occupant as { get?: (type: typeof GridCellBlocker) => unknown };
        if (entity.get?.(GridCellBlocker)) return null;
      }
      return { col: landCol, row: landRow, layer: currentLayer, cost: 2 };
    }

    // Block movement into walls
    if (this.grid.isWall(targetCell)) {
      // Platform jump-down: if on a platform and moving cardinal into a wall, skip over it
      if (allowPlatformJumps && !isDiagonal && currentCell.properties.has('platform')) {
        const beyondCol = newCol + dir.col;
        const beyondRow = newRow + dir.row;
        const beyondCell = this.grid.getCell(beyondCol, beyondRow);
        if (beyondCell && !this.grid.isWall(beyondCell) && !beyondCell.properties.has('blocked')
          && !this.grid.isTransition(beyondCell)) {
          return { col: beyondCol, row: beyondRow, layer: this.grid.getLayer(beyondCell), cost: 2 };
        }
      }
      return null;
    }

    // Platform jump-down to lower layer (cardinal only)
    if (currentCellLayer !== targetLayer && !allowLayerChanges) {
      if (allowPlatformJumps && !isDiagonal && currentCell.properties.has('platform') && targetLayer < currentCellLayer
        && !targetCell.properties.has('blocked') && !this.grid.isTransition(targetCell)) {
        return { col: newCol, row: newRow, layer: targetLayer, cost: 2 };
      }
      return null;
    }

    return { col: newCol, row: newRow, layer: currentLayer, cost: 1 };
  }

  private reconstructPath(node: PathNode): Array<{ col: number; row: number }> {
    const path: Array<{ col: number; row: number }> = [];
    let current: PathNode | null = node;

    while (current !== null) {
      path.unshift({ col: current.col, row: current.row });
      current = current.parent;
    }

    return path;
  }
}
