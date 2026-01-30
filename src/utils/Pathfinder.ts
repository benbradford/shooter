import type { Grid } from './Grid';
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
  private readonly grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  findPath(
    startCol: number,
    startRow: number,
    goalCol: number,
    goalRow: number,
    currentLayer: number,
    allowLayerChanges: boolean = false,
    allowDiagonals: boolean = false
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

      const neighbors = this.getNeighbors(current.col, current.row, current.layer, allowLayerChanges, allowDiagonals);
      for (const neighbor of neighbors) {
        const key = `${neighbor.col},${neighbor.row},${neighbor.layer}`;
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
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

  private getNeighbors(col: number, row: number, currentLayer: number, allowLayerChanges: boolean, allowDiagonals: boolean): Array<{ col: number; row: number; layer: number }> {
    const neighbors: Array<{ col: number; row: number; layer: number }> = [];
    const currentCell = this.grid.getCell(col, row);
    if (!currentCell) return neighbors;

    const directions = [
      { col: 0, row: -1 }, // Up
      { col: 0, row: 1 },  // Down
      { col: -1, row: 0 }, // Left
      { col: 1, row: 0 },  // Right
    ];

    if (allowDiagonals && !currentCell.isTransition) {
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

      const neighbor = this.getValidNeighbor(currentCell, targetCell, dir, currentLayer, newCol, newRow, allowLayerChanges);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getValidNeighbor(
    currentCell: { layer: number; isTransition: boolean },
    targetCell: { layer: number; isTransition: boolean; occupants: Set<unknown> },
    dir: { col: number; row: number },
    currentLayer: number,
    newCol: number,
    newRow: number,
    allowLayerChanges: boolean
  ): { col: number; row: number; layer: number } | null {
    for (const occupant of targetCell.occupants) {
      const entity = occupant as { get?: (type: typeof GridCellBlocker) => unknown };
      if (entity.get?.(GridCellBlocker)) {
        return null;
      }
    }

    const isDiagonal = dir.col !== 0 && dir.row !== 0;
    const isHorizontal = dir.col !== 0 && dir.row === 0;

    if (targetCell.isTransition) {
      return { col: newCol, row: newRow, layer: targetCell.layer };
    }

    if (currentCell.isTransition) {
      if (isHorizontal) {
        return null;
      }
      return { col: newCol, row: newRow, layer: targetCell.layer };
    }

    // Block diagonal movement across layer boundaries
    if (isDiagonal && currentCell.layer !== targetCell.layer) {
      return null;
    }

    // Block diagonal movement if either adjacent cell blocks movement
    if (isDiagonal) {
      const currentCol = newCol - dir.col;
      const currentRow = newRow - dir.row;
      
      const sideCell1 = this.grid.getCell(newCol, currentRow);
      const sideCell2 = this.grid.getCell(currentCol, newRow);
      
      if (sideCell1?.layer !== currentLayer) {
        return null;
      }
      if (sideCell2?.layer !== currentLayer) {
        return null;
      }
    }

    // Block movement into wall edges (layer 1 with layer 0 below)
    if (targetCell.layer === 1) {
      const cellBelow = this.grid.getCell(newCol, newRow + 1);
      if (cellBelow?.layer === 0) {
        if (dir.col !== 0 && dir.row === 0) {
          return null;
        }
        if (!allowLayerChanges) {
          return null;
        }
      }
    }

    if (currentCell.layer !== targetCell.layer && !allowLayerChanges) {
      return null;
    }

    return { col: newCol, row: newRow, layer: currentLayer };
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
