export function decayingRotationAngleDeg(initialSpeedDegPerSec: number, elapsedInSec: number, decayTimeConstantSec: number): number {
  return initialSpeedDegPerSec * decayTimeConstantSec * (1 - Math.exp(-elapsedInSec / decayTimeConstantSec));
}
