#!/usr/bin/env python3
"""
Generate sprite sheet from floating_robot images.
Layout: idle (8 directions) + walk (8 dirs x 8 frames) + death (8 dirs x 7 frames) + fireball (8 dirs x 6 frames)
Total: 8 + 64 + 56 + 48 = 176 frames
Grid: 16 columns x 11 rows
"""
from PIL import Image
import os

# Directories
base_dir = "public/assets/floating_robot"
rotations_dir = f"{base_dir}/rotations"
walk_dir = f"{base_dir}/animations/scary-walk"
death_dir = f"{base_dir}/animations/falling-back-death"
fireball_dir = f"{base_dir}/animations/fireball"

# Frame size
FRAME_WIDTH = 48
FRAME_HEIGHT = 48

# Direction order (matches game's Direction enum)
directions = ['south', 'north', 'west', 'east', 'north-west', 'north-east', 'south-west', 'south-east']

# Create sprite sheet: 16 cols x 11 rows
COLS = 16
ROWS = 11
sheet_width = COLS * FRAME_WIDTH
sheet_height = ROWS * FRAME_HEIGHT
sprite_sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

frame_index = 0

# Row 0: Idle frames (8 directions)
for direction in directions:
    img_path = f"{rotations_dir}/{direction}.png"
    if os.path.exists(img_path):
        img = Image.open(img_path)
        col = frame_index % COLS
        row = frame_index // COLS
        sprite_sheet.paste(img, (col * FRAME_WIDTH, row * FRAME_HEIGHT))
        frame_index += 1

# Rows 1-8: Walk animation (8 directions x 8 frames)
for direction in directions:
    for frame_num in range(8):
        img_path = f"{walk_dir}/{direction}/frame_{frame_num:03d}.png"
        if os.path.exists(img_path):
            img = Image.open(img_path)
            col = frame_index % COLS
            row = frame_index // COLS
            sprite_sheet.paste(img, (col * FRAME_WIDTH, row * FRAME_HEIGHT))
            frame_index += 1

# Rows 8-11: Death animation (8 directions x 7 frames)
for direction in directions:
    for frame_num in range(7):
        img_path = f"{death_dir}/{direction}/frame_{frame_num:03d}.png"
        if os.path.exists(img_path):
            img = Image.open(img_path)
            col = frame_index % COLS
            row = frame_index // COLS
            sprite_sheet.paste(img, (col * FRAME_WIDTH, row * FRAME_HEIGHT))
            frame_index += 1

# Remaining: Fireball animation (8 directions x 6 frames)
for direction in directions:
    for frame_num in range(6):
        img_path = f"{fireball_dir}/{direction}/frame_{frame_num:03d}.png"
        if os.path.exists(img_path):
            img = Image.open(img_path)
            col = frame_index % COLS
            row = frame_index // COLS
            sprite_sheet.paste(img, (col * FRAME_WIDTH, row * FRAME_HEIGHT))
            frame_index += 1

# Save sprite sheet
output_path = f"{base_dir}/floating-robot-spritesheet.png"
sprite_sheet.save(output_path)
print(f"Sprite sheet created: {output_path}")
print(f"Total frames: {frame_index}")
print(f"Dimensions: {sheet_width}x{sheet_height}")
print(f"Frame size: {FRAME_WIDTH}x{FRAME_HEIGHT}")
