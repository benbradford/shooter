#!/usr/bin/env python3
"""
Rebuild attacker spritesheet with cross-punch animations.
Layout:
- Frames 0-7: Idle rotations (8 directions)
- Frames 8-55: Cross-punch animations (8 directions × 6 frames)
"""

from PIL import Image
import os

FRAME_SIZE = 56
ASSETS_DIR = "public/assets/attacker"
OUTPUT_FILE = f"{ASSETS_DIR}/attacker-spritesheet.png"

# Direction order for cross-punch
PUNCH_DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']

def main():
    # Load idle frames
    idle_frames = []
    rotations_dir = f"{ASSETS_DIR}/rotations"
    idle_order = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
    
    for direction in idle_order:
        frame_path = f"{rotations_dir}/{direction}.png"
        if os.path.exists(frame_path):
            idle_frames.append(Image.open(frame_path))
        else:
            print(f"Warning: Missing idle frame {direction}")
    
    # Load cross-punch frames
    punch_frames = []
    punch_dir = f"{ASSETS_DIR}/animations/cross-punch"
    
    for direction in PUNCH_DIRECTIONS:
        dir_path = f"{punch_dir}/{direction}"
        
        # Use west for south-west if south-west doesn't exist
        if direction == 'south-west' and not os.path.exists(dir_path):
            dir_path = f"{punch_dir}/west"
        
        if os.path.exists(dir_path):
            frame_files = sorted([f for f in os.listdir(dir_path) if f.endswith('.png')])
            for frame_file in frame_files:
                frame_path = f"{dir_path}/{frame_file}"
                punch_frames.append(Image.open(frame_path))
        else:
            print(f"Warning: Missing punch direction {direction}")
    
    # Combine all frames
    all_frames = idle_frames + punch_frames
    total_frames = len(all_frames)
    
    # Calculate spritesheet dimensions (8 columns)
    cols = 8
    rows = (total_frames + cols - 1) // cols
    
    # Create spritesheet
    sheet_width = cols * FRAME_SIZE
    sheet_height = rows * FRAME_SIZE
    spritesheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
    
    # Paste frames
    for i, frame in enumerate(all_frames):
        col = i % cols
        row = i // cols
        x = col * FRAME_SIZE
        y = row * FRAME_SIZE
        
        # Resize frame if needed
        if frame.size != (FRAME_SIZE, FRAME_SIZE):
            frame = frame.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
        
        spritesheet.paste(frame, (x, y))
    
    # Save
    spritesheet.save(OUTPUT_FILE)
    print(f"Created spritesheet: {OUTPUT_FILE}")
    print(f"Total frames: {total_frames}")
    print(f"Dimensions: {sheet_width}x{sheet_height} ({cols}x{rows} frames)")
    print(f"\nFrame layout:")
    print(f"  0-7: Idle rotations")
    print(f"  8-55: Cross-punch animations (8 directions × 6 frames)")

if __name__ == '__main__':
    main()
