/**
 * Known WorldState flag names — prevents typos and documents the flag namespace.
 * Lua scripts can still set arbitrary flags; these are the ones referenced in TypeScript.
 */
export const WorldFlags = {
  // Player abilities
  canPunch: 'canPunch',
  canSwim: 'canSwim',
  canJump: 'canJump',
  canPush: 'canPush',
  hasSuperPunch: 'hasSuperPunch',
  hasAutoHeal: 'hasAutoHeal',
  hasCompanion: 'hasCompanion',

  // Pet system
  petSelected: 'pet_selected',
  petRockCollected: 'pet_rock_collected',
  petDogCollected: 'pet_dog_collected',
  petBubbleCollected: 'pet_bubble_collected',

  // Escort system
  currentEscort: 'current_escort',

  // Collectibles
  mistOrb: 'mist_orb',
  showMistOrbs: 'show_mist_orbs',

  // Internal
  enteredViaHole: '_enteredViaHole',
} as const;

export type WorldFlagName = typeof WorldFlags[keyof typeof WorldFlags];
