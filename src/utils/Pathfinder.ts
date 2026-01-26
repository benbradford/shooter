import type { Grid } from './Grid';

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
    currentLayer: number
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

      const currentCell = this.grid.getCell(current.col, current.row);
      if (current.col === goalCol && current.row === goalRow && currentCell && !currentCell.isTransition) {
        return this.reconstructPath(current);
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(`${current.col},${current.row},${current.layer}`);

      const neighbors = this.getNeighbors(current.col, current.row, current.layer);
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
    return Math.abs(col1 - col2) + Math.abs(row1 - row2);
  }

  private getNeighbors(col: number, row: number, currentLayer: number): Array<{ col: number; row: number; layer: number }> {
    const neighbors: Array<{ col: number; row: number; layer: number }> = [];
    const currentCell = this.grid.getCell(col, row);
    if (!currentCell) return neighbors;

    const directions = [
      { col: 0, row: -1 }, // Up
      { col: 0, row: 1 },  // Down
      { col: -1, row: 0 }, // Left
      { col: 1, row: 0 },  // Right
    ];

    for (const dir of directions) {
      const newCol = col + dir.col;
      const newRow = row + dir.row;
      const targetCell = this.grid.getCell(newCol, newRow);
      if (!targetCell) continue;

      const neighbor = this.getValidNeighbor(currentCell, targetCell, dir, currentLayer, newCol, newRow);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getValidNeighbor(
    currentCell: { layer: number; isTransition: boolean },
    targetCell: { layer: number; isTransition: boolean },
    dir: { col: number; row: number },
    currentLayer: number,
    newCol: number,
    newRow: number
  ): { col: number; row: number; layer: number } | null {
    const isVerticalMove = dir.col === 0;
    const movingUp = dir.row < 0;
    const movingDown = dir.row > 0;

    if (currentCell.isTransition) {
      return this.getNeighborFromTransition(targetCell, isVerticalMove, movingUp, movingDown, currentLayer, newCol, newRow);
    }

    if (targetCell.isTransition) {
      return this.getNeighborToTransition(isVerticalMove, movingUp, movingDown, currentLayer, targetCell.layer, newCol, newRow);
    }

    if (targetCell.layer === currentLayer) {
      return { col: newCol, row: newRow, layer: currentLayer };
    }

    return null;
  }

  private getNeighborFromTransition(
    targetCell: { layer: number },
    isVerticalMove: boolean,
    movingUp: boolean,
    movingDown: boolean,
    entityLayer: number,
    newCol: number,
    newRow: number
  ): { col: number; row: number; layer: number } | null {
    if (!isVerticalMove) return null;

    if (movingUp && targetCell.layer >= entityLayer && targetCell.layer <= entityLayer + 1) {
      return { col: newCol, row: newRow, layer: targetCell.layer };
    }

    if (movingDown && targetCell.layer >= entityLayer - 1 && targetCell.layer <= entityLayer) {
      return { col: newCol, row: newRow, layer: targetCell.layer };
    }

    return null;
  }

  private getNeighborToTransition(
    isVerticalMove: boolean,
    movingUp: boolean,
    movingDown: boolean,
    currentLayer: number,
    targetCellLayer: number,
    newCol: number,
    newRow: number
  ): { col: number; row: number; layer: number } | null {
    if (!isVerticalMove) return null;

    if (movingDown && currentLayer >= targetCellLayer) {
      return { col: newCol, row: newRow, layer: targetCellLayer };
    }

    if (movingUp && currentLayer <= targetCellLayer) {
      return { col: newCol, row: newRow, layer: targetCellLayer };
    }

    return null;
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
