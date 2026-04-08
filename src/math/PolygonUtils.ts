export type Vec2 = { readonly x: number; readonly y: number };

export function isConvex(vertices: ReadonlyArray<Vec2>): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let hasNonZeroCross = false;
  const EPSILON = 1;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const c = vertices[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross > EPSILON) return false;
    if (Math.abs(cross) > EPSILON) hasNonZeroCross = true;
  }
  return hasNonZeroCross;
}

export function computeNormals(vertices: ReadonlyArray<Vec2>): Vec2[] | null {
  const normals: Vec2[] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    normals.push({ x: dy / len, y: -dx / len });
  }
  return normals;
}

export function isPointInPolygon(px: number, py: number, vertices: ReadonlyArray<Vec2>): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross > 0) return false;
  }
  return true;
}

export function ensureClockwise(vertices: ReadonlyArray<Vec2>): Vec2[] {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    area += (b.x - a.x) * (b.y + a.y);
  }
  if (area < 0) {
    return [...vertices].reverse();
  }
  return [...vertices];
}
