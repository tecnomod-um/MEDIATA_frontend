#!/bin/bash
# Update CSS modules to use active theme variables instead of -light suffix

for file in $(find src -name "*.module.css" -type f); do
  # Replace -light suffix with nothing (use active theme variables)
  sed -i 's/var(--background-color-1-light)/var(--background-color-1)/g' "$file"
  sed -i 's/var(--background-color-2-light)/var(--background-color-2)/g' "$file"
  sed -i 's/var(--background-color-3-light)/var(--background-color-3)/g' "$file"
  sed -i 's/var(--background-color-card-light)/var(--background-color-card)/g' "$file"
  sed -i 's/var(--background-nav-and-headers-background-color-light)/var(--background-nav-and-headers-background-color)/g' "$file"
  sed -i 's/var(--text-color-on-darkbg-light)/var(--text-color-on-darkbg)/g' "$file"
  sed -i 's/var(--button-color-light)/var(--button-color)/g' "$file"
  sed -i 's/var(--button-color-hover-light)/var(--button-color-hover)/g' "$file"
  sed -i 's/var(--button-color-shadow-light)/var(--button-color-shadow)/g' "$file"
  sed -i 's/var(--button-gradient-light)/var(--button-gradient)/g' "$file"
  sed -i 's/var(--tooltray-background-color-light)/var(--tooltray-background-color)/g' "$file"
done

echo "Updated CSS modules to use active theme variables"
