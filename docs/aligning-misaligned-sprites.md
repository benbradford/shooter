# Aligning Misaligned Sprite Frames

When AI image generators (ChatGPT, Midjourney, etc.) create multi-frame sprites, they often draw each frame in slightly different positions. This causes jittery animations where the static parts shift between frames.

## The Problem

AI-generated sprite sheets often have:
- Wall mounts in different positions
- Character bodies shifted between frames
- Static elements that should be identical but aren't

## The Solution: Normalize Both Frames Identically

Instead of calculating offsets manually, normalize both frames the same way: trim → center → same canvas size.

## Simple 4-Step Process

### 1. Split the Frames

```bash
magick spritesheet.png -crop 613x672+0+0 +repage frame1_raw.png
magick spritesheet.png -crop 613x672+613+0 +repage frame2_raw.png
```

### 2. Trim Empty Space

Remove transparent borders so the sprite becomes the bounding box:

```bash
magick frame1_raw.png -trim +repage frame1_trim.png
magick frame2_raw.png -trim +repage frame2_trim.png
```

### 3. Normalize Both Onto Same Canvas

Use the larger frame size so neither gets clipped:

```bash
magick frame1_trim.png -gravity center -background none -extent 350x600 frame1.png
magick frame2_trim.png -gravity center -background none -extent 350x600 frame2.png
```

Now both frames have:
- Same canvas size
- Centered bounding box
- Same anchor point

### 4. Verify Alignment

Toggle them quickly:

```bash
magick frame1.png frame2.png -delay 40 -loop 0 preview.gif
```

If the static parts stay still, the alignment worked.

## One-Liner Version

```bash
magick spritesheet.png -crop 613x672 +repage -trim +repage -gravity center -background none -extent 400x650 aligned_%d.png
```

This splits, trims, centers, and outputs identical canvases in one command.

## Why This Works

AI sprites usually differ by:
- Extra transparent space
- Slightly different crop area
- Minor offsets

Trimming → centering → normalizing removes those differences automatically.

## Manual Alignment (When Normalization Fails)

If the simple approach doesn't work, use anchor-based alignment:

### 1. Find the Anchor Point (Solid Structure)

Exclude flame/animated parts by removing their colors, then find the bounding box:

```bash
magick left.png -fuzz 20% -fill none +opaque '#FF8800' -fill none +opaque '#FFAA00' -fill none +opaque '#FFCC00' -trim info:
magick right.png -fuzz 20% -fill none +opaque '#FF8800' -fill none +opaque '#FFAA00' -fill none +opaque '#FFCC00' -trim info:
```

Output shows the solid structure's position:
```
left.png PNG 90x131 613x672+282+229
right.png PNG 80x125 613x672+355+231
```

### 2. Calculate the Delta

```
Right offset - Left offset = Delta
+355+231 - +282+229 = +73+2
```

### 3. Align by Shifting Frame 2

```bash
magick spritesheet.png -crop 613x672+0+0 +repage frame1.png
magick -size 613x672 xc:none \( spritesheet.png -crop 613x672+613+0 +repage \) -geometry -73-2 -composite frame2.png
```

## Example: Sconce Alignment

```bash
cd public/assets/interior

# Extract frames
magick sconce.png -crop 613x672+0+0 +repage left.png
magick sconce.png -crop 613x672+613+0 +repage right.png

# Find wall mount positions (excluding flame colors)
magick left.png -fuzz 20% -fill none +opaque '#FF8800' -fill none +opaque '#FFAA00' -fill none +opaque '#FFCC00' -trim info:
# Output: 613x672+282+229

magick right.png -fuzz 20% -fill none +opaque '#FF8800' -fill none +opaque '#FFAA00' -fill none +opaque '#FFCC00' -trim info:
# Output: 613x672+355+231

# Calculate delta: 355-282=73, 231-229=2
# Shift frame2 by -73,-2

magick sconce.png -crop 613x672+0+0 +repage sconce_frame1.png
magick -size 613x672 xc:none \( sconce.png -crop 613x672+613+0 +repage \) -geometry -73-2 -composite sconce_frame2.png

# Clean up
rm left.png right.png
```

## Preventing the Problem

When generating sprites with AI, ask for:
- Two-frame sprite sheet
- Frames perfectly aligned
- Only flame/animated part varies
- Transparent background
- Equal frame width

This prevents 90% of alignment issues.

## Common Anchor Points

- **Wall-mounted objects**: Wall mount plate or screws
- **Characters**: Feet position or hip center
- **Vehicles**: Wheel axle or chassis center
- **Buildings**: Foundation or door frame

## Verifying Alignment

After alignment, overlay both frames in an image viewer and toggle between them. The static parts should not move at all.
