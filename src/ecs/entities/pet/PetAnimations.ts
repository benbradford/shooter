import { Animation } from '../../../systems/animation/Animation';
import type { PetConfig, PetSpritesheetMetadata } from './PetConfig';
import { ALL_DIRECTIONS, DIR_8_TO_4, DIR_8_TO_8 } from './PetConfig';

function rangeToFrameStrings(start: number, end: number): string[] {
  const frames: string[] = [];
  for (let i = start; i <= end; i++) {
    frames.push(String(i));
  }
  return frames;
}

export function createPetAnimationMap(
  metadata: PetSpritesheetMetadata,
  config: PetConfig
): Map<string, Animation> {
  const animMap = new Map<string, Animation>();
  const dirMap = config.directions === 4 ? DIR_8_TO_4 : DIR_8_TO_8;

  console.log('[PetAnimations] Creating animations for', config.id, 'with', config.directions, 'directions');
  console.log('[PetAnimations] Idle anim:', config.idleAnim, 'Walk anim:', config.walkAnim);

  ALL_DIRECTIONS.forEach(dir => {
    const metaDir = dirMap[dir];
    
    const idleRange = metadata.animations[config.idleAnim]?.[metaDir];
    if (idleRange) {
      const frames = rangeToFrameStrings(idleRange.start, idleRange.end);
      animMap.set(`idle_${dir}`, new Animation(frames, 'repeat', 0.125));
      console.log(`[PetAnimations] Created idle_${dir} with frames`, frames);
    }
    
    const walkRange = metadata.animations[config.walkAnim]?.[metaDir];
    if (walkRange) {
      const frames = rangeToFrameStrings(walkRange.start, walkRange.end);
      animMap.set(`walk_${dir}`, new Animation(frames, 'repeat', 0.1));
      console.log(`[PetAnimations] Created walk_${dir} with frames`, frames);
    }
  });

  return animMap;
}
