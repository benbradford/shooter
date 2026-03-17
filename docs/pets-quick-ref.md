# Pet System - Quick Reference

## Enabling Pets

Set WorldState flags in `public/states/default.json`:

```json
{
  "player": {
    "health": 100,
    "coins": 0,
    "currentLevel": "dungeon1",
    "entryCell": { "col": 0, "row": 0 }
  },
  "flags": {
    "pet_rock_collected": "true",
    "pet_selected": "rock"
  },
  "levels": {}
}
```

Available pets: `"rock"` (4-dir, 48x48) or `"dog"` (8-dir, 32x32)

## Controls

- **H key** - Trigger pet ability (logs message for now)
- Pet follows automatically using pathfinding

## Behavior

- Pet stops within 128px of player
- Pet teleports if > 800px away
- Pet hides when player enters water (alpha=0)
- **Movement:** Direct movement when close (<200px), pathfinding when far to navigate obstacles
- Pet ability disabled when:
  - Player is punching
  - Player is swimming
  - Pet is > 250px away

## Testing

```bash
npm run test:single test-pet-basic           # Spawn and follow
npm run test:single test-pet-ability         # Ability activation
npm run test:single test-pet-ability-disabled # Disable conditions
npm run test:single test-pet-teleport        # Teleport behavior
```

## Architecture

- **PetManager** - Singleton, spawns pets based on WorldState
- **PetFollowComponent** - Pathfinding, distance checks, water detection
- **PetAbilityComponent** - Replaces SlideAbilityComponent, checks conditions
- **PetActionButtonComponent** - HUD button at 75% width, 85% height

## Adding New Pets

1. Create spritesheet with `scripts/generate-{pet}-spritesheet.mjs`
2. Add to `PET_REGISTRY` in `src/ecs/entities/pet/PetConfig.ts`
3. Add to `AssetRegistry.ts` core group
4. Set WorldState flags to enable

## Key Files

- `src/systems/PetManager.ts` - Pet lifecycle
- `src/ecs/entities/pet/PetEntity.ts` - Entity factory
- `src/ecs/components/pet/PetFollowComponent.ts` - Following logic
- `src/ecs/components/pet/PetAbilityComponent.ts` - Ability system
- `features/pets/` - Design docs and tasks
