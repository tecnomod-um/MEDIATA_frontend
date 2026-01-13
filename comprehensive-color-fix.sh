#!/bin/bash
# Comprehensive color replacement

for file in $(find src -name "*.module.css" -type f); do
  # Text colors - more comprehensive
  sed -i 's/\bcolor:\s*#fff\b/color: var(--text-color-on-darkbg)/g' "$file"
  sed -i 's/\bcolor:\s*#ffffff\b/color: var(--text-color-on-darkbg)/g' "$file"
  sed -i 's/\bcolor:\s*white\b/color: var(--text-color-on-darkbg)/g' "$file"
  
  # More background color variations
  sed -i 's/background-color:\s*#f8f8f8/background-color: var(--background-color-3)/g' "$file"
  sed -i 's/background-color:\s*#f2f2f2/background-color: var(--background-color-secondary)/g' "$file"
  sed -i 's/background-color:\s*#e9e9e9/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#e8e8e8/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#eee\b/background-color: var(--background-color-tertiary)/g' "$file"
  
  # Background without -color
  sed -i 's/\bbackground:\s*#fff\b/background: var(--background-color-card)/g' "$file"
  sed -i 's/\bbackground:\s*white\b/background: var(--background-color-card)/g' "$file"
done

echo "Comprehensive color fix applied"
