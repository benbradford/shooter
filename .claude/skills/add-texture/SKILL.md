---
name: add-texture
description: Register a background texture PNG by name. Performs all 4 required steps (AssetRegistry, editor group, TexturePicker).
---

# Add Texture

Register a new background texture so it's usable in-game and in the editor.

## Usage

The user provides a texture key name (e.g., `dead_tree4`, `stone_wall3`). The PNG is assumed to already exist at `public/assets/cell_drawables/{name}.png`.

## Steps

1. **Verify** the PNG exists at `public/assets/cell_drawables/{name}.png`. If not, warn the user but continue (they may add it later).

2. **Register in AssetRegistry** (`src/assets/AssetRegistry.ts`):
   - Add an entry in the `ASSET_REGISTRY` object in alphabetical position near similar assets:
     ```typescript
     {name}: {
       key: '{name}',
       path: 'assets/cell_drawables/{name}.png',
       type: 'image' as const,
     },
     ```

3. **Add to editor asset group** in `src/assets/AssetRegistry.ts`:
   - Find the `editor:` array in the `ASSET_GROUPS` section
   - Add `'{name}'` in alphabetical position near similar assets

4. **Add to TexturePicker** (`editor/panels/TexturePicker.ts`):
   - Add `'{name}'` to the `BACKGROUND_TEXTURE_KEYS` array in alphabetical position

5. **Build** to confirm no TypeScript errors: `npm run build`

6. Report success with all files modified.
