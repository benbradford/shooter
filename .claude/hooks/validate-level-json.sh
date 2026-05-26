#!/bin/bash
# Validates that a level JSON file has valid JSON and required fields.
# Called by PostToolUse hook after edits to public/levels/*.json.
# Exit 0 = OK, Exit 2 = block (invalid).

# The edited file path is passed via $CLAUDE_TOOL_ARG_FILE_PATH
FILE="$CLAUDE_TOOL_ARG_FILE_PATH"

if [ -z "$FILE" ]; then
  exit 0
fi

# Only validate level JSON files
case "$FILE" in
  */public/levels/*.json) ;;
  *) exit 0 ;;
esac

if [ ! -f "$FILE" ]; then
  exit 0
fi

# Check valid JSON and required fields
RESULT=$(python3 -c "
import json, sys
try:
    with open('$FILE') as f:
        data = json.load(f)
    errors = []
    if 'width' not in data: errors.append('missing width')
    if 'height' not in data: errors.append('missing height')
    if 'playerStart' not in data: errors.append('missing playerStart')
    if 'cells' not in data: errors.append('missing cells')
    if errors:
        print('Level validation failed: ' + ', '.join(errors))
        sys.exit(1)
except json.JSONDecodeError as e:
    print(f'Invalid JSON: {e}')
    sys.exit(1)
" 2>&1)

if [ $? -ne 0 ]; then
  echo "{\"decision\":\"block\",\"reason\":\"$RESULT\"}"
  exit 2
fi

exit 0
