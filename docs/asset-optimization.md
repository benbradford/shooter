# Asset Optimization Guide

## Running an Asset Audit

**⚠️ CRITICAL: NEVER DELETE ASSETS AUTOMATICALLY ⚠️**

**AI assistants must NEVER delete asset files. Only show audit results.**

To identify unused and oversized assets:

```bash
# Create audit script
cat > /tmp/asset_audit.py << 'EOF'
#!/usr/bin/env python3
import os
import re
import json

# Get registered assets from AssetRegistry.ts
registered_keys = set()
with open('src/assets/AssetRegistry.ts', 'r') as f:
    content = f.read()
    matches = re.findall(r"key:\s*'([^']+)'", content)
    registered_keys.update(matches)

# Get texture references from level JSON files
level_textures = set()
for root, dirs, files in os.walk('public/levels'):
    for file in files:
        if file.endswith('.json'):
            with open(os.path.join(root, file), 'r') as f:
                try:
                    data = json.load(f)
                    if 'background' in data:
                        bg = data['background']
                        for key in ['floor_texture', 'wall_texture', 'stairs_texture', 
                                    'platform_texture', 'path_texture', 'water_texture']:
                            if key in bg and bg[key]:
                                level_textures.add(bg[key])
                    if 'cells' in data:
                        for cell in data['cells']:
                            if 'backgroundTexture' in cell and cell['backgroundTexture']:
                                level_textures.add(cell['backgroundTexture'])
                except:
                    pass

all_referenced = registered_keys | level_textures

# Get actual asset files (excluding animation frames)
actual_files = {}
for root, dirs, files in os.walk('public/assets'):
    if '/animations/' in root or '/rotations/' in root:
        continue
    for file in files:
        if file.endswith(('.png', '.jpg', '.jpeg')):
            filepath = os.path.join(root, file)
            basename = os.path.splitext(file)[0]
            size = os.path.getsize(filepath)
            actual_files[basename] = (filepath, size)

# Find unreferenced
unreferenced = []
for basename, (filepath, size) in actual_files.items():
    if basename not in all_referenced:
        unreferenced.append((size, basename, filepath))

unreferenced.sort(reverse=True)

print("=== UNREFERENCED ASSETS ===\n")
total_size = 0
for size, basename, filepath in unreferenced:
    size_mb = size / 1024 / 1024
    if size_mb >= 1:
        print(f"{size_mb:>5.1f}MB - {basename}")
    elif size / 1024 >= 1:
        print(f"{size/1024:>5.0f}KB - {basename}")
    else:
        print(f"{size:>5}B  - {basename}")
    total_size += size

print(f"\nTotal unreferenced: {total_size/1024/1024:.1f}MB ({len(unreferenced)} files)")
EOF

python3 /tmp/asset_audit.py
```

**⚠️ DO NOT DELETE FILES - Only review the audit results with the user.**

## Resizing Large Assets

To halve the dimensions of an image (reduces file size by ~75-90%):

```bash
# Single file
sips -z 512 512 public/assets/path/to/image.png

# Get dimensions first
sips -g pixelWidth -g pixelHeight public/assets/path/to/image.png

# Resize to 50% of dimensions
# For 1024x1024: sips -z 512 512
# For 1536x1024: sips -z 768 512
```

## Compensating for Resized Sprites

When you halve sprite dimensions, double the scale in code:

```typescript
// Before (1024x1024 sprite)
const scale = (grid.cellSize / 153) * 1.2;

// After (512x512 sprite)
const scale = (grid.cellSize / 153) * 1.2 * 2;
```

## Removing Unused Assets

**⚠️ CRITICAL: Always verify with the user before deleting any assets.**

The audit script may incorrectly flag assets as unreferenced if they are:
- Loaded dynamically at runtime
- Used in code but not in AssetRegistry
- Backup/source files that should be kept

**Process:**
1. Run audit script to identify candidates
2. Review results with user
3. User manually deletes files they confirm are unused

**If user approves deletion:**
1. **Remove from AssetRegistry.ts** - Delete the asset entry (if present)
2. **Remove from AssetLoader.ts** - Remove from default keys array (if present)
3. **Remove from ASSET_GROUPS** - Remove from group arrays (if present)
4. **User deletes file** - User runs `rm public/assets/path/to/file.png`

## Common Unreferenced Assets

- `*_old.png` - Old versions, safe to delete
- `*_original.png` - Backup versions, safe to delete
- `*_failed.png` - Failed attempts, safe to delete
- Animation source frames - Can delete after spritesheet is generated
- Rotation frames - Can delete after spritesheet is generated

## Asset Size Guidelines

- **Textures**: 512x512 or 1024x1024 max
- **Sprites**: Match frame size (48x48, 56x56, 64x64)
- **UI elements**: 128x128 to 256x256
- **Backgrounds**: 1024x1024 max (tiled)

## Example Optimization Session

From February 2026 audit:
- **Before**: 67MB total assets
- **After**: 41MB total assets
- **Savings**: 26MB (39% reduction)

Actions taken:
- Resized 12 large textures (>1MB) to 50% dimensions
- Removed mist.png (1.5MB, unused)
- Doubled sprite scales in code to compensate
