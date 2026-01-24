#!/usr/bin/env python3
from PIL import Image
import json
import os

BASE_DIR = "public/assets/thrower"
FRAME_SIZE = 48
DIRECTIONS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]

with open(f"{BASE_DIR}/metadata.json") as f:
    metadata = json.load(f)

animations = metadata["frames"]["animations"]
rotations = metadata["frames"]["rotations"]

# Layout: rows = [idle_south, idle_se, idle_e, idle_ne, idle_n, idle_nw, idle_w, idle_sw,
#                 walk_south, walk_se, walk_e, walk_ne, walk_n, walk_nw, walk_w, walk_sw,
#                 throw_south, throw_se, throw_e, throw_ne, throw_n, throw_nw, throw_w, throw_sw,
#                 death_south, death_se, death_e, death_ne, death_n, death_nw, death_w, death_sw]
# Columns: max frames across all animations

max_frames = max(
    1,  # idle (1 frame)
    len(animations["walking-4-frames"]["south"]),
    len(animations["throw-object"]["south"]),
    len(animations["falling-back-death"]["south"])
)

rows = 32  # 4 animations * 8 directions
cols = max_frames

sheet = Image.new("RGBA", (cols * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))

row = 0

# Idle (rotations)
for direction in DIRECTIONS:
    img = Image.open(f"{BASE_DIR}/{rotations[direction]}")
    sheet.paste(img, (0, row * FRAME_SIZE))
    row += 1

# Walking
for direction in DIRECTIONS:
    for i, frame_path in enumerate(animations["walking-4-frames"][direction]):
        img = Image.open(f"{BASE_DIR}/{frame_path}")
        sheet.paste(img, (i * FRAME_SIZE, row * FRAME_SIZE))
    row += 1

# Throw
for direction in DIRECTIONS:
    for i, frame_path in enumerate(animations["throw-object"][direction]):
        img = Image.open(f"{BASE_DIR}/{frame_path}")
        sheet.paste(img, (i * FRAME_SIZE, row * FRAME_SIZE))
    row += 1

# Death
for direction in DIRECTIONS:
    for i, frame_path in enumerate(animations["falling-back-death"][direction]):
        img = Image.open(f"{BASE_DIR}/{frame_path}")
        sheet.paste(img, (i * FRAME_SIZE, row * FRAME_SIZE))
    row += 1

sheet.save(f"{BASE_DIR}/thrower_spritesheet.png")
print(f"Created {BASE_DIR}/thrower_spritesheet.png")
print(f"Dimensions: {cols * FRAME_SIZE}x{rows * FRAME_SIZE} ({cols} cols x {rows} rows)")
print(f"Frame size: {FRAME_SIZE}x{FRAME_SIZE}")
