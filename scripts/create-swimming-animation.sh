#!/bin/bash

# Create swimming animation from pushing animation
INPUT_DIR="public/assets/attacker/animations/pushing"
OUTPUT_DIR="public/assets/attacker/animations/swimming"

mkdir -p "$OUTPUT_DIR"

# Process each direction
for dir in south south-east east north-east north north-west west south-west; do
  mkdir -p "$OUTPUT_DIR/$dir"
  
  for frame in "$INPUT_DIR/$dir"/frame_*.png; do
    filename=$(basename "$frame")
    output="$OUTPUT_DIR/$dir/$filename"
    
    # Get image dimensions
    height=$(identify -format "%h" "$frame")
    submerge_height=$((height * 50 / 100))
    visible_height=$((height - submerge_height))
    
    # Create very dark blue overlay for bottom 50%, full opacity
    convert "$frame" \
      \( +clone -crop "x${submerge_height}+0+${visible_height}" \
         -channel RGB -fill "rgb(0,0,40)" -colorize 95% +channel \) \
      -gravity south -composite \
      "$output"
  done
done

echo "Swimming animation created in $OUTPUT_DIR"
