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

/** Ear-clipping triangulation. Input must be clockwise. Returns array of triangles (each 3 vertices). */
export function triangulate(vertices: ReadonlyArray<Vec2>): Vec2[][] {
  if (vertices.length < 3) return [];
  if (vertices.length === 3) return [[vertices[0], vertices[1], vertices[2]]];
  if (isConvex(vertices)) return [Array.from(vertices)];

  const indices = vertices.map((_, i) => i);
  const triangles: Vec2[][] = [];

  const cross = (a: Vec2, b: Vec2, c: Vec2) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const isEar = (prev: number, cur: number, next: number): boolean => {
    const a = vertices[indices[prev]];
    const b = vertices[indices[cur]];
    const c = vertices[indices[next]];
    // Must be convex (clockwise = negative cross)
    if (cross(a, b, c) >= 0) return false;
    // No other vertex inside this triangle
    for (let i = 0; i < indices.length; i++) {
      if (i === prev || i === cur || i === next) continue;
      const p = vertices[indices[i]];
      if (cross(a, b, p) < 0 && cross(b, c, p) < 0 && cross(c, a, p) < 0) return false;
    }
    return true;
  };

  let safety = indices.length * indices.length;
  while (indices.length > 3 && safety-- > 0) {
    let earFound = false;
    for (let i = 0; i < indices.length; i++) {
      const prev = (i + indices.length - 1) % indices.length;
      const next = (i + 1) % indices.length;
      if (isEar(prev, i, next)) {
        triangles.push([vertices[indices[prev]], vertices[indices[i]], vertices[indices[next]]]);
        indices.splice(i, 1);
        earFound = true;
        break;
      }
    }
    if (!earFound) break;
  }
  if (indices.length === 3) {
    triangles.push([vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]]);
  }
  return triangles;
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
  // Ray-casting algorithm — works for convex and concave polygons
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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
