# SOP: Adding Background Textures

## When to Use

When the user asks to add a new texture to a grid cell — e.g. "add `crumbled_cottage.png` as a backgroundTexture", "register `well` as a cell texture", "make `shrine` available in the editor".

## Prerequisites

- Texture PNG already in the repo (typical location: `public/assets/cell_drawables/`)
- Recommended size: 128×128 to 1024×1024. Resize with `sips -z 128 128 path/to/file.png` on macOS if oversized.

## The 4 Required Steps

All four steps are required. Skipping any one of them means the texture either won't load, won't appear in the editor, or won't render in-game.

### Step 1: Place the PNG

Drop the file under `public/assets/cell_drawables/` (or another subdirectory under `public/assets/` if it's an interior/prop/etc.).

### Step 2: Register in `AssetRegistry`

Add an entry to `ASSET_REGISTRY` in `src/assets/AssetRegistry.ts`:

```typescript
crumbled_cottage: {
  key: 'crumbled_cottage',
  path: 'assets/cell_drawables/crumbled_cottage.png',
  type: 'image' as const,
},
```

### Step 3: Add to the `editor` asset group

In the **same file** (`src/assets/AssetRegistry.ts`), append the new key to the `editor` array inside `ASSET_GROUPS`. Without this, the editor's asset loader won't preload the texture and the picker will show a placeholder.

```typescript
editor: [..., 'crumbled_cottage', 'abandoned_hut', 'shrine'] as const,
```

### Step 4: Add to `BACKGROUND_TEXTURE_KEYS`

In `editor/panels/TexturePicker.ts`, append the key to `BACKGROUND_TEXTURE_KEYS` so it shows up under the **Background** tab of the texture picker:

```typescript
const BACKGROUND_TEXTURE_KEYS = [
  ...,
  'crumbled_cottage', 'abandoned_hut', 'shrine',
];
```

## Verifying

```bash
npm run build              # Must pass
```

Then in the dev server:

1. Open the editor at `http://localhost:5173/editor/`
2. Pick any level, select **Grid** tool → click a cell with the **Select** tool
3. Click **Choose** under Texture → **Background** tab
4. Confirm the new texture appears (filterable via the search box)
5. Apply it to a cell → save (Ctrl+S) → reload the level in-game
6. Confirm it renders at the placed cell

## Optional: Transform Override

If the texture needs custom scaling/positioning per-cell, save the texture from the editor with a transform — the resulting JSON uses the object form:

```json
{
  "backgroundTexture": {
    "image": "crumbled_cottage",
    "transformOverride": { "scaleX": 1.5, "scaleY": 1.5, "offsetX": 0, "offsetY": -8 }
  }
}
```

The editor's Cell form has scaleX/scaleY/offsetX/offsetY inputs once a texture is set — no code change needed for per-cell transforms.

## Optional: Spritesheet Sub-sprites

If the source PNG contains multiple sprites (cropped via `sourceRect`), register it instead in `editor/SpritesheetTextures.ts` and follow the spritesheet workflow in `docs/level-themes.md` § "Adding a Spritesheet to SPRITESHEET_TEXTURES".

## Checklist

- [ ] PNG placed under `public/assets/cell_drawables/` (or appropriate subfolder)
- [ ] Entry added to `ASSET_REGISTRY` in `src/assets/AssetRegistry.ts` (type `'image'`)
- [ ] Key appended to `editor` array in `ASSET_GROUPS` (same file)
- [ ] Key appended to `BACKGROUND_TEXTURE_KEYS` in `editor/panels/TexturePicker.ts`
- [ ] `npm run build` passes
- [ ] Texture visible in editor's Background tab
- [ ] Texture renders correctly when placed on a cell

## Common Issues

**Texture missing from picker but build passes:** You forgot Step 4 (`BACKGROUND_TEXTURE_KEYS`).

**Texture shows as a `__MISSING` placeholder in editor:** You forgot Step 3 (`editor` asset group).

**Texture missing from in-game render after Save:** Make sure the level JSON has `"backgroundTexture": "<key>"` on the cell. If yes, the asset isn't being loaded for that level — confirm Step 3 is done so the asset loader includes it via the editor group (in-game uses level-specific groups, but Step 3 is enough for textures placed via the editor since `AssetLoader.getRequiredAssetGroups()` reads referenced texture keys from the level JSON).

**Texture wrong size on cells:** Use the editor's per-cell transform inputs (scaleX/scaleY/offsetX/offsetY) — they're stored as `transformOverride` in the cell JSON.
