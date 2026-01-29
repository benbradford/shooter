export enum Direction {
  None,
  Down,
  Up,
  Left,
  Right,
  UpLeft,
  UpRight,
  DownLeft,
  DownRight,
}

// eslint-disable-next-line complexity -- 8-direction logic is inherently complex
export function dirFromDelta(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return Direction.None;

  const angle = Math.atan2(dy, dx);
  const deg = (angle * 180) / Math.PI;

  if (deg >= -22.5 && deg < 22.5) return Direction.Right;
  if (deg >= 22.5 && deg < 67.5) return Direction.DownRight;
  if (deg >= 67.5 && deg < 112.5) return Direction.Down;
  if (deg >= 112.5 && deg < 157.5) return Direction.DownLeft;
  if (deg >= 157.5 || deg < -157.5) return Direction.Left;
  if (deg >= -157.5 && deg < -112.5) return Direction.UpLeft;
  if (deg >= -112.5 && deg < -67.5) return Direction.Up;
  if (deg >= -67.5 && deg < -22.5) return Direction.UpRight;

  return Direction.None;
}

export function directionToAnimationName(dir: Direction): string {
  switch (dir) {
    case Direction.Down: return 'south';
    case Direction.Up: return 'north';
    case Direction.Left: return 'west';
    case Direction.Right: return 'east';
    case Direction.UpLeft: return 'north_west';
    case Direction.UpRight: return 'north_east';
    case Direction.DownLeft: return 'south_west';
    case Direction.DownRight: return 'south_east';
    default: return 'south';
  }
}
