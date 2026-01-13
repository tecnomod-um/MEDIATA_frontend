#!/bin/bash
# Remove redundant @import statements for variables.css

for file in $(find src -name "*.module.css" -type f); do
  # Remove the @import line for variables.css
  sed -i '/^@import.*variables\.css/d' "$file"
  # Also remove if it has quotes
  sed -i "/^@import.*variables\.css/d" "$file"
done

echo "Removed redundant @import statements"
