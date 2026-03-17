import { Direction } from '../../../constants/Direction';

export type PetConfig = {
  readonly id: string;
  readonly spritesheet: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly scale: number;
  readonly directions: 4 | 8;
  readonly idleAnim: string;
  readonly walkAnim: string;
  readonly abilityCooldownMs: number;
  readonly worldStateFlag: string;
  readonly iconTexture: string;
};

export type PetSpritesheetMetadata = {
  frameSize: number;
  cols: number;
  rows: number;
  totalFrames: number;
  animations: Record<string, Record<string, { start: number; end: number }>>;
  rotations: Record<string, number>;
};

export const PET_REGISTRY: Record<string, PetConfig> = {
  rock: {
    id: 'rock',
    spritesheet: 'rock_spritesheet',
    frameWidth: 48,
    frameHeight: 48,
    scale: 1.5,
    directions: 4,
    idleAnim: 'breathing-idle',
    walkAnim: 'walking',
    abilityCooldownMs: 5000,
    worldStateFlag: 'pet_rock_collected',
    iconTexture: 'rock_pet_icon',
  },
  dog: {
    id: 'dog',
    spritesheet: 'dog_spritesheet',
    frameWidth: 32,
    frameHeight: 32,
    scale: 2,
    directions: 8,
    idleAnim: 'breathing-idle',
    walkAnim: 'walk',
    abilityCooldownMs: 3000,
    worldStateFlag: 'pet_dog_collected',
    iconTexture: 'dog_pet_icon',
  },
};

export const DIR_8_TO_4: Record<Direction, string> = {
  [Direction.None]: 'south',
  [Direction.Down]: 'south',
  [Direction.Up]: 'north',
  [Direction.Left]: 'east',
  [Direction.Right]: 'west',
  [Direction.UpLeft]: 'east',
  [Direction.UpRight]: 'north',
  [Direction.DownLeft]: 'east',
  [Direction.DownRight]: 'west',
};

export const DIR_8_TO_8: Record<Direction, string> = {
  [Direction.None]: 'south',
  [Direction.Down]: 'south',
  [Direction.Up]: 'north',
  [Direction.Left]: 'west',
  [Direction.Right]: 'east',
  [Direction.UpLeft]: 'north-west',
  [Direction.UpRight]: 'north-east',
  [Direction.DownLeft]: 'south-west',
  [Direction.DownRight]: 'south-east',
};

export const ALL_DIRECTIONS = [
  Direction.Down,
  Direction.Up,
  Direction.Left,
  Direction.Right,
  Direction.UpLeft,
  Direction.UpRight,
  Direction.DownLeft,
  Direction.DownRight,
];
