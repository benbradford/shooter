import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';

export type TargetingProps = {
  originX: number;
  originY: number;
  facingAngleRadians: number;
  fovRadians: number;
  rangePx: number;
  candidates: Entity[];
  requireFacing: boolean;
}

export function findNearestEntityInFOV(props: TargetingProps): Entity | null {
  let nearestEntity: Entity | null = null;
  let nearestDistance = props.rangePx;

  for (const candidate of props.candidates) {
    const transform = candidate.get(TransformComponent);
    if (!transform) continue;

    const dx = transform.x - props.originX;
    const dy = transform.y - props.originY;
    const dist = Math.hypot(dx, dy);
    if (dist >= nearestDistance) continue;

    if (props.requireFacing) {
      let angleDiff = Math.atan2(dy, dx) - props.facingAngleRadians;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      if (Math.abs(angleDiff) > props.fovRadians / 2) continue;
    }

    nearestEntity = candidate;
    nearestDistance = dist;
  }

  return nearestEntity;
}
