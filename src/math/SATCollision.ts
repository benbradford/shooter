import type { Vec2 } from './PolygonUtils';

export type AABB = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ConvexPolygon = {
  readonly vertices: ReadonlyArray<Vec2>;
  readonly normals: ReadonlyArray<Vec2>;
};

export function testAABBvsPolygon(aabb: AABB, polygon: ConvexPolygon): Vec2 | null {
  let minOverlap = Infinity;
  let mtvX = 0;
  let mtvY = 0;

  // X-axis
  const aabbMinX = aabb.x;
  const aabbMaxX = aabb.x + aabb.width;
  let polyMinX = Infinity;
  let polyMaxX = -Infinity;
  for (const v of polygon.vertices) {
    if (v.x < polyMinX) polyMinX = v.x;
    if (v.x > polyMaxX) polyMaxX = v.x;
  }
  const overlapX = Math.min(aabbMaxX, polyMaxX) - Math.max(aabbMinX, polyMinX);
  if (overlapX <= 0) return null;
  if (overlapX < minOverlap) {
    minOverlap = overlapX;
    const sign = (aabb.x + aabb.width / 2) < (polyMinX + polyMaxX) / 2 ? -1 : 1;
    mtvX = sign;
    mtvY = 0;
  }

  // Y-axis
  const aabbMinY = aabb.y;
  const aabbMaxY = aabb.y + aabb.height;
  let polyMinY = Infinity;
  let polyMaxY = -Infinity;
  for (const v of polygon.vertices) {
    if (v.y < polyMinY) polyMinY = v.y;
    if (v.y > polyMaxY) polyMaxY = v.y;
  }
  const overlapY = Math.min(aabbMaxY, polyMaxY) - Math.max(aabbMinY, polyMinY);
  if (overlapY <= 0) return null;
  if (overlapY < minOverlap) {
    minOverlap = overlapY;
    const sign = (aabb.y + aabb.height / 2) < (polyMinY + polyMaxY) / 2 ? -1 : 1;
    mtvX = 0;
    mtvY = sign;
  }

  // Polygon edge normals
  for (const normal of polygon.normals) {
    const d0 = aabb.x * normal.x + aabb.y * normal.y;
    const d1 = (aabb.x + aabb.width) * normal.x + aabb.y * normal.y;
    const d2 = aabb.x * normal.x + (aabb.y + aabb.height) * normal.y;
    const d3 = (aabb.x + aabb.width) * normal.x + (aabb.y + aabb.height) * normal.y;
    const aabbMin = Math.min(d0, d1, d2, d3);
    const aabbMax = Math.max(d0, d1, d2, d3);

    let pMin = Infinity;
    let pMax = -Infinity;
    for (const v of polygon.vertices) {
      const d = v.x * normal.x + v.y * normal.y;
      if (d < pMin) pMin = d;
      if (d > pMax) pMax = d;
    }

    const overlap = Math.min(aabbMax, pMax) - Math.max(aabbMin, pMin);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      const aabbCenter = (aabbMin + aabbMax) / 2;
      const polyCenter = (pMin + pMax) / 2;
      const sign = aabbCenter < polyCenter ? -1 : 1;
      mtvX = normal.x * sign;
      mtvY = normal.y * sign;
    }
  }

  return { x: mtvX * minOverlap, y: mtvY * minOverlap };
}

export function getOverlappingCells(
  vertices: ReadonlyArray<Vec2>,
  normals: ReadonlyArray<Vec2>,
  cellSizePx: number
): Array<{ col: number; row: number }> {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }

  const startCol = Math.floor(minX / cellSizePx);
  const endCol = Math.floor(maxX / cellSizePx);
  const startRow = Math.floor(minY / cellSizePx);
  const endRow = Math.floor(maxY / cellSizePx);

  const result: Array<{ col: number; row: number }> = [];
  const polygon: ConvexPolygon = { vertices, normals };
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cellAABB: AABB = {
        x: col * cellSizePx,
        y: row * cellSizePx,
        width: cellSizePx,
        height: cellSizePx,
      };
      if (testAABBvsPolygon(cellAABB, polygon) !== null) {
        result.push({ col, row });
      }
    }
  }
  return result;
}
