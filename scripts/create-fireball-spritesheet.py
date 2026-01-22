#!/usr/bin/env python3
from PIL import Image

# Load the three fireball frames
frames = [
    Image.open('public/assets/floating_robot/fireball01.png'),
    Image.open('public/assets/floating_robot/fireball02.png'),
    Image.open('public/assets/floating_robot/fireball03.png')
]

# Create spritesheet (3 frames horizontally)
width = 64 * 3
height = 64
spritesheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))

# Paste frames
for i, frame in enumerate(frames):
    spritesheet.paste(frame, (i * 64, 0))

# Save
spritesheet.save('public/assets/floating_robot/fireball-spritesheet.png')
print('✓ Created fireball-spritesheet.png (192x64, 3 frames)')
