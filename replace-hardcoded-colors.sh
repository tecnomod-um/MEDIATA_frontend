#!/bin/bash
# Replace common hardcoded colors with CSS variables

for file in $(find src -name "*.module.css" -type f); do
  # Replace common hardcoded colors
  sed -i 's/background-color:\s*#ffffff/background-color: var(--background-color-card)/g' "$file"
  sed -i 's/background-color:\s*#fff\([^0-9a-fA-F]\)/background-color: var(--background-color-card)\1/g' "$file"
  sed -i 's/background:\s*#ffffff/background: var(--background-color-card)/g' "$file"
  sed -i 's/background:\s*#fff\([^0-9a-fA-F]\)/background: var(--background-color-card)\1/g' "$file"
  
  sed -i 's/background-color:\s*#ecebeb/background-color: var(--background-color-1)/g' "$file"
  sed -i 's/background-color:\s*#f0f0f0/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#f9f9f9/background-color: var(--background-color-3)/g' "$file"
  
  sed -i 's/color:\s*#333333/color: var(--text-color-primary)/g' "$file"
  sed -i 's/color:\s*#333\([^0-9a-fA-F]\)/color: var(--text-color-primary)\1/g' "$file"
  sed -i 's/color:\s*#555555/color: var(--text-color-secondary)/g' "$file"
  sed -i 's/color:\s*#555\([^0-9a-fA-F]\)/color: var(--text-color-secondary)\1/g' "$file"
  sed -i 's/color:\s*#666666/color: var(--text-color-tertiary)/g' "$file"
  sed -i 's/color:\s*#666\([^0-9a-fA-F]\)/color: var(--text-color-tertiary)\1/g' "$file"
  
  sed -i 's/border:\s*1px solid #ccc/border: 1px solid var(--border-color)/g' "$file"
  sed -i 's/border:\s*1px solid #ddd/border: 1px solid var(--border-color-secondary)/g' "$file"
done

echo "Replaced hardcoded colors with variables"
