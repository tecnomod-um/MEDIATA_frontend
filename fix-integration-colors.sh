#!/bin/bash
# Fix all hardcoded colors in Integration components

for file in src/components/Integration/**/*.module.css; do
  # Background colors - light grays
  sed -i 's/background-color:\s*#f5f5f5/background-color: var(--background-color-secondary)/g' "$file"
  sed -i 's/background-color:\s*#fafafa/background-color: var(--background-color-4)/g' "$file"
  sed -i 's/background-color:\s*#f8f9fa/background-color: var(--background-color-5)/g' "$file"
  sed -i 's/background:\s*#fafafa/background: var(--background-color-4)/g' "$file"
  
  # Background colors - medium grays
  sed -i 's/background-color:\s*#e0e0e0/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#e2e6ea/background-color: var(--background-color-tertiary)/g' "$file"
  sed -i 's/background:\s*#e0e0e0/background: var(--background-color-tertiary)/g' "$file"
  
  # Background colors - darker grays  
  sed -i 's/background-color:\s*#c6c6c6/background-color: var(--border-color-secondary)/g' "$file"
  sed -i 's/background-color:\s*#6c757d/background-color: var(--text-color-tertiary)/g' "$file"
  sed -i 's/background-color:\s*#5a6268/background-color: var(--text-color-secondary)/g' "$file"
  
  # Borders and separators
  sed -i 's/background:\s*#ccc/background: var(--border-color)/g' "$file"
  sed -i 's/background:\s*#999/background: var(--text-color-muted)/g' "$file"
  sed -i 's/border:\s*2px dashed #bbb/border: 2px dashed var(--border-color)/g' "$file"
  sed -i 's/border-color:\s*#aaa/border-color: var(--border-color)/g' "$file"
  sed -i 's/border-bottom:\s*1px solid #eee/border-bottom: 1px solid var(--border-color-secondary)/g' "$file"
  
  # Text colors
  sed -i 's/\bcolor:\s*#6c757d/color: var(--text-color-secondary)/g' "$file"
  sed -i 's/\bcolor:\s*#888\b/color: var(--text-color-muted)/g' "$file"
  sed -i 's/\bcolor:\s*#777\b/color: var(--text-color-muted)/g' "$file"
  sed -i 's/\bcolor:\s*#bbb\b/color: var(--border-color)/g' "$file"
  sed -i 's/\bcolor:\s*#050505/color: var(--text-color-primary)/g' "$file"
done

echo "Fixed Integration component colors"
