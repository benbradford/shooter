export type Rarity = 'nothing' | 'rare' | 'epic' | 'mythic' | 'legendary';

export const RARITY_COIN_COUNTS: Record<Rarity, { min: number; max: number }> = {
  nothing: { min: 0, max: 0 },
  rare: { min: -2, max: 2 },
  epic: { min: -1, max: 5 },
  mythic: { min: 0, max: 10 },
  legendary: { min: 10, max: 20 }
};

export const RARITY_MEDIPACK_CHANCE: Record<Rarity, number> = {
  nothing: 0,
  rare: 0.05,
  epic: 0.1,
  mythic: 0.2,
  legendary: 0.3
};

