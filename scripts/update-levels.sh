#!/bin/bash
# Update level files from Downloads to project

DOWNLOADS_DIR="$HOME/Downloads"
LEVELS_DIR="$(dirname "$0")/../public/levels"

# Copy default.json if it exists
if [ -f "$DOWNLOADS_DIR/default.json" ]; then
  cp "$DOWNLOADS_DIR/default.json" "$LEVELS_DIR/default.json"
  echo "✓ Updated default.json"
else
  echo "✗ default.json not found in Downloads"
fi

# Copy any other level files (level1.json, level2.json, etc.)
for file in "$DOWNLOADS_DIR"/level*.json; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    cp "$file" "$LEVELS_DIR/$filename"
    echo "✓ Updated $filename"
  fi
done

echo "Done! Refresh your browser to see changes."
