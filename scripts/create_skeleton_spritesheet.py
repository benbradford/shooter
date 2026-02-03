#!/usr/bin/env python3
from PIL import Image
import os

FRAME_SIZE = 48
DIRECTIONS_8 = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
DIRECTIONS_4 = ['south', 'east', 'north', 'west']
BASE_PATH = 'public/assets/skeleton'
OUTPUT_PATH = 'public/assets/skeleton/skeleton-spritesheet.png'

ANIMATIONS = [
    ('idle', 'rotations', 1, DIRECTIONS_8),
    ('walk', 'animations/walking-4-frames', 4, DIRECTIONS_8),
    ('jab', 'animations/lead-jab', 3, DIRECTIONS_8),
    ('punch', 'animations/taking-punch', 6, DIRECTIONS_4)
]

MAX_FRAMES = 6
total_rows = sum(len(dirs) for _, _, _, dirs in ANIMATIONS)
sheet = Image.new('RGBA', (FRAME_SIZE * MAX_FRAMES, FRAME_SIZE * total_rows))

row = 0
for anim_name, anim_path, frame_count, directions in ANIMATIONS:
    for direction in directions:
        for col in range(frame_count):
            if anim_name == 'idle':
                frame_path = f'{BASE_PATH}/{anim_path}/{direction}.png'
            else:
                frame_path = f'{BASE_PATH}/{anim_path}/{direction}/frame_{col:03d}.png'
            
            if os.path.exists(frame_path):
                frame = Image.open(frame_path)
                sheet.paste(frame, (col * FRAME_SIZE, row * FRAME_SIZE))
        row += 1

sheet.save(OUTPUT_PATH)
print(f'Created sprite sheet: {OUTPUT_PATH}')
print(f'Dimensions: {FRAME_SIZE * MAX_FRAMES}x{FRAME_SIZE * row} ({MAX_FRAMES} cols x {row} rows)')
print(f'Layout: idle(1f,8dir), walk(4f,8dir), jab(3f,8dir), punch(6f,4dir)')
