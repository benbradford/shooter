export type Rarity = 'nothing' | 'rare' | 'epic' | 'mythic' | 'legendary';

export const RARITY_COIN_COUNTS: Record<Rarity, { min: number; max: number }> = {
  nothing: { min: 0, max: 0 },
  rare: { min: 1, max: 2 },
  epic: { min: 3, max: 5 },
  mythic: { min: 6, max: 8 },
  legendary: { min: 10, max: 15 }
};
