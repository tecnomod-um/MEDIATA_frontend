#!/bin/bash
# Fix remaining hardcoded colors that were missed

for file in $(find src -name "*.module.css" -type f); do
  # Replace 'color: black' with variable
  sed -i 's/color:\s*black/color: var(--text-color-dark)/g' "$file"
  
  # Replace 'background: white' (not background-color)
  sed -i 's/background:\s*white\([^-]\)/background: var(--background-color-card)\1/g' "$file"
  
  # Replace more specific cases
  sed -i 's/border-color:\s*#ccc/border-color: var(--border-color)/g' "$file"
  sed -i 's/border-color:\s*#ddd/border-color: var(--border-color-secondary)/g' "$file"
done

echo "Fixed remaining hardcoded colors"
