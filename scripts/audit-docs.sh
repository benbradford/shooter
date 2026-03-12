#!/bin/bash

# Documentation Audit Script
# Checks for bloat and suggests improvements

echo "=== Documentation Audit ==="
echo ""

# Total line count
TOTAL=$(wc -l docs/*.md 2>/dev/null | tail -1 | awk '{print $1}')
echo "Total documentation: $TOTAL lines"
echo "Target: <7,000 lines"
echo ""

if [ "$TOTAL" -gt 7000 ]; then
    echo "⚠️  WARNING: Documentation exceeds target size"
    echo ""
fi

# Find largest files
echo "=== Largest Files ==="
wc -l docs/*.md 2>/dev/null | sort -rn | head -11
echo ""

# Find code blocks (potential bloat)
echo "=== Files with Most Code Blocks ==="
for file in docs/*.md; do
    count=$(grep -c '```' "$file" 2>/dev/null || echo 0)
    if [ "$count" -gt 0 ]; then
        echo "$count blocks - $(basename $file)"
    fi
done | sort -rn | head -10
echo ""

# Find JSON examples (potential bloat)
echo "=== Files with JSON Examples ==="
for file in docs/*.md; do
    count=$(grep -c '"col":' "$file" 2>/dev/null || echo 0)
    if [ "$count" -gt 0 ]; then
        echo "$count JSON examples - $(basename $file)"
    fi
done | sort -rn | head -10
echo ""

# Check for stale references
echo "=== Potential Stale References ==="
echo "Checking for deleted features..."

# Check for references to deleted files
if grep -r "LevelSelectorScene" docs/ 2>/dev/null | grep -v "Binary"; then
    echo "Found references to deleted LevelSelectorScene"
fi

echo ""
echo "=== Recommendations ==="
echo "1. Files >300 lines should be reviewed for condensation"
echo "2. Code blocks should show non-obvious patterns only"
echo "3. JSON examples should be removed if they duplicate level files"
echo "4. Check for duplicate information across files"
echo ""
echo "Run: kiro-cli chat --agent dodging-bullets"
echo "Say: 'audit the docs and suggest improvements'"
