#!/usr/bin/env python3
from PIL import Image
import os

FRAME_SIZE = 48
DIRECTIONS = ['south', 'north', 'west', 'east']
FRAMES_PER_DIRECTION = 4

base_path = 'public/assets/bug'
output_path = f'{base_path}/bug-spritesheet.png'

cols = FRAMES_PER_DIRECTION
rows = len(DIRECTIONS)
sheet_width = cols * FRAME_SIZE
sheet_height = rows * FRAME_SIZE

sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

for row_idx, direction in enumerate(DIRECTIONS):
    for frame_idx in range(FRAMES_PER_DIRECTION):
        frame_path = f'{base_path}/running-4-frames/{direction}/frame_{frame_idx:03d}.png'
        if os.path.exists(frame_path):
            frame = Image.open(frame_path)
            x = frame_idx * FRAME_SIZE
            y = row_idx * FRAME_SIZE
            sheet.paste(frame, (x, y))

sheet.save(output_path)
print(f'✓ Generated {output_path}')
print(f'  Size: {sheet_width}x{sheet_height}')
print(f'  Grid: {cols} cols × {rows} rows')
print(f'  Frame size: {FRAME_SIZE}x{FRAME_SIZE}')
