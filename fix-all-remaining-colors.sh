#!/bin/bash
# Fix all remaining hardcoded colors across all components

for file in $(find src -name "*.module.css" -type f); do
  # Light backgrounds
  sed -i 's/background-color:\s*#f5f5f5\b/background-color: var(--background-color-secondary)/g' "$file"
  sed -i 's/background-color:\s*#fafafa\b/background-color: var(--background-color-4)/g' "$file"
  sed -i 's/background-color:\s*#f8f9fa\b/background-color: var(--background-color-5)/g' "$file"
  sed -i 's/background:\s*#fafafa\b/background: var(--background-color-4)/g' "$file"
  sed -i 's/background:\s*#f5f5f5\b/background: var(--background-color-secondary)/g' "$file"
  
  # Medium gray backgrounds
  sed -i 's/background-color:\s*#e0e0e0\b/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#e2e6ea\b/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background:\s*#e0e0e0\b/background: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#eee\b/background-color: var(--background-color-tertiary)/g' "$file"
  
  # Darker gray backgrounds
  sed -i 's/background-color:\s*#c6c6c6\b/background-color: var(--border-color-secondary)/g' "$file"
  sed -i 's/background-color:\s*#6c757d\b/background-color: var(--text-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#5a6268\b/background-color: var(--text-color-secondary)/g' "$file"
  sed -i 's/background:\s*#ccc\b/background: var(--border-color)/g' "$file"
  sed -i 's/background:\s*#999\b/background: var(--text-color-muted)/g' "$file"
  sed -i 's/background:\s*#ddd\b/background: var(--border-color-secondary)/g' "$file"
  
  # Borders
  sed -i 's/border:\s*2px dashed #bbb/border: 2px dashed var(--border-color)/g' "$file"
  sed -i 's/border-color:\s*#aaa\b/border-color: var(--border-color)/g' "$file"
  sed -i 's/border-bottom:\s*1px solid #eee/border-bottom: 1px solid var(--border-color-secondary)/g' "$file"
  sed -i 's/border-top:\s*1px solid #eee/border-top: 1px solid var(--border-color-secondary)/g' "$file"
  sed -i 's/border:\s*1px solid #e0e0e0/border: 1px solid var(--border-color-secondary)/g' "$file"
  sed -i 's/border:\s*1px solid #bbb/border: 1px solid var(--border-color)/g' "$file"
  
  # Text colors
  sed -i 's/\bcolor:\s*#6c757d\b/color: var(--text-color-secondary)/g' "$file"
  sed -i 's/\bcolor:\s*#888\b/color: var(--text-color-muted)/g' "$file"
  sed -i 's/\bcolor:\s*#777\b/color: var(--text-color-muted)/g' "$file"
  sed -i 's/\bcolor:\s*#bbb\b/color: var(--border-color)/g' "$file"
  sed -i 's/\bcolor:\s*#050505\b/color: var(--text-color-primary)/g' "$file"
  sed -i 's/\bcolor:\s*#0f2433\b/color: var(--text-color-dark)/g' "$file"
  sed -i 's/\bcolor:\s*#334e57\b/color: var(--text-color-secondary)/g' "$file"
done

echo "Fixed all remaining hardcoded colors"
