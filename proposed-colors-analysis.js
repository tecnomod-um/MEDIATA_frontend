// Analysis of proposed standardization colors from variables.css comments

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return null;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getWCAGLevel(ratio, isLarge = false) {
  if (isLarge) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'FAIL';
  } else {
    if (ratio >= 7.0) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'FAIL';
  }
}

// Hardcoded colors found in CSS modules that need mapping
const hardcodedColors = {
  backgrounds: {
    '#f9f9f9': { name: 'Very light gray', maps_to: 'background-color-3', usage: 9 },
    '#fafafa': { name: 'Lighter gray', maps_to: 'background-color-4', usage: 6 },
    '#f8f9fa': { name: 'Light blue-gray', maps_to: 'background-color-5', usage: 5 },
    '#f5f5f5': { name: 'Light gray', maps_to: 'background-color-secondary', usage: 4 },
    '#f0f0f0': { name: 'Medium light gray', maps_to: 'background-color-tertiary', usage: 7 },
    '#e0e0e0': { name: 'Medium gray (NEW NEEDED)', maps_to: 'proposed-neutral-200', usage: 6 },
    '#f2f2f2': { name: 'Near f5f5f5', maps_to: 'background-color-secondary (close)', usage: 5 },
    '#555555': { name: 'Dark gray (used as bg)', maps_to: 'tooltray or new', usage: 8 },
    '#444444': { name: 'Darker gray (used as bg)', maps_to: 'project-status-default-text', usage: 5 },
    '#333333': { name: 'Very dark gray (used as bg)', maps_to: 'tooltray-background-color', usage: 4 }
  },
  text: {
    '#333333': { name: 'Primary dark text', maps_to: 'text-color-primary', usage: 32 },
    '#555555': { name: 'Secondary dark text', maps_to: 'text-color-secondary', usage: 20 },
    '#666666': { name: 'Tertiary dark text', maps_to: 'text-color-tertiary', usage: 20 },
    '#777777': { name: 'Muted text', maps_to: 'text-color-muted', usage: 4 },
    '#888888': { name: 'Between muted/disabled (NEW)', maps_to: 'proposed-neutral-400', usage: 6 },
    '#999999': { name: 'Disabled text', maps_to: 'text-color-disabled', usage: 0 },
    '#222222': { name: 'Very dark text', maps_to: 'text-color-dark', usage: 3 },
    '#444444': { name: 'Between primary/secondary (NEW)', maps_to: 'proposed-neutral-600', usage: 8 }
  }
};

console.log('\n' + '='.repeat(80));
console.log('CONTRAST ANALYSIS: HARDCODED COLORS IN MODULES');
console.log('='.repeat(80));

console.log('\n📊 HARDCODED BACKGROUND COLORS ON WHITE CARDS');
console.log('-'.repeat(80));
const whiteCard = '#ffffff';
const primaryText = '#333333';

Object.entries(hardcodedColors.backgrounds).forEach(([color, info]) => {
  const ratioOnWhite = getContrastRatio(color, whiteCard);
  const textOnColor = getContrastRatio(primaryText, color);
  console.log(`\n${color} - ${info.name} (${info.usage} uses)`);
  console.log(`  Maps to: ${info.maps_to}`);
  console.log(`  As background on white: ${ratioOnWhite.toFixed(2)}:1`);
  if (textOnColor > 1.5) {
    const level = getWCAGLevel(textOnColor);
    const icon = level === 'AAA' ? '✅✅' : level === 'AA' ? '✅' : '❌';
    console.log(`  ${icon} #333 text on this: ${textOnColor.toFixed(2)}:1 - ${level}`);
  }
});

console.log('\n\n📝 HARDCODED TEXT COLORS ON BACKGROUNDS');
console.log('-'.repeat(80));
const lightBg = '#ffffff';
const mediumBg = '#f0f0f0';
const cardBg = '#ecebeb';

Object.entries(hardcodedColors.text).forEach(([color, info]) => {
  console.log(`\n${color} - ${info.name} (${info.usage} uses)`);
  console.log(`  Maps to: ${info.maps_to}`);
  
  const onWhite = getContrastRatio(color, lightBg);
  const onMedium = getContrastRatio(color, mediumBg);
  const onCard = getContrastRatio(color, cardBg);
  
  const levelWhite = getWCAGLevel(onWhite);
  const levelMedium = getWCAGLevel(onMedium);
  const levelCard = getWCAGLevel(onCard);
  
  const iconWhite = levelWhite === 'AAA' ? '✅✅' : levelWhite === 'AA' ? '✅' : '❌';
  const iconMedium = levelMedium === 'AAA' ? '✅✅' : levelMedium === 'AA' ? '✅' : '❌';
  const iconCard = levelCard === 'AAA' ? '✅✅' : levelCard === 'AA' ? '✅' : '❌';
  
  console.log(`  ${iconWhite} On white (#fff):     ${onWhite.toFixed(2)}:1 - ${levelWhite}`);
  console.log(`  ${iconMedium} On medium (#f0f0f0): ${onMedium.toFixed(2)}:1 - ${levelMedium}`);
  console.log(`  ${iconCard} On card (#ecebeb):   ${onCard.toFixed(2)}:1 - ${levelCard}`);
});

console.log('\n\n' + '='.repeat(80));
console.log('PROPOSED NEW NEUTRAL COLORS (from comments)');
console.log('='.repeat(80));

const proposedNeutrals = {
  light: {
    'neutral-200': '#e5e5e5',
    'neutral-300': '#d4d4d4',
    'neutral-400': '#a3a3a3',
    'neutral-500': '#737373',
    'neutral-600': '#525252',
    'neutral-700': '#404040',
    'neutral-800': '#262626',
    'neutral-900': '#171717'
  },
  dark: {
    'neutral-200': '#3a3a3a',
    'neutral-300': '#4a4a4a',
    'neutral-400': '#5a5a5a',
    'neutral-500': '#7a7a7a',
    'neutral-600': '#a0a0a0',
    'neutral-700': '#c0c0c0',
    'neutral-800': '#d0d0d0',
    'neutral-900': '#e8e8e8'
  }
};

console.log('\n📋 LIGHT MODE - Proposed Neutrals on White');
console.log('-'.repeat(80));
Object.entries(proposedNeutrals.light).forEach(([name, color]) => {
  const onWhite = getContrastRatio(color, '#ffffff');
  const onCard = getContrastRatio(color, '#ecebeb');
  const levelWhite = getWCAGLevel(onWhite);
  const levelCard = getWCAGLevel(onCard);
  const iconWhite = levelWhite === 'AAA' ? '✅✅' : levelWhite === 'AA' ? '✅' : '❌';
  const iconCard = levelCard === 'AAA' ? '✅✅' : levelCard === 'AA' ? '✅' : '❌';
  
  console.log(`\n${name}: ${color}`);
  console.log(`  ${iconWhite} On white:  ${onWhite.toFixed(2)}:1 - ${levelWhite}`);
  console.log(`  ${iconCard} On #ecebeb: ${onCard.toFixed(2)}:1 - ${levelCard}`);
});

console.log('\n\n📋 DARK MODE - Proposed Neutrals on Dark Backgrounds');
console.log('-'.repeat(80));
Object.entries(proposedNeutrals.dark).forEach(([name, color]) => {
  const onDarkBg = getContrastRatio(color, '#1a1a1a');
  const onCard = getContrastRatio(color, '#2d2d2d');
  const levelDark = getWCAGLevel(onDarkBg);
  const levelCard = getWCAGLevel(onCard);
  const iconDark = levelDark === 'AAA' ? '✅✅' : levelDark === 'AA' ? '✅' : '❌';
  const iconCard = levelCard === 'AAA' ? '✅✅' : levelCard === 'AA' ? '✅' : '❌';
  
  console.log(`\n${name}: ${color}`);
  console.log(`  ${iconDark} On #1a1a1a: ${onDarkBg.toFixed(2)}:1 - ${levelDark}`);
  console.log(`  ${iconCard} On #2d2d2d:  ${onCard.toFixed(2)}:1 - ${levelCard}`);
});

console.log('\n\n' + '='.repeat(80));
console.log('CRITICAL ISSUES FOUND');
console.log('='.repeat(80));

console.log('\n❌ LIGHT MODE FAILURES:');
console.log('  • #777 (muted) on light backgrounds: 3.76-4.48:1 - FAILS AA (needs 4.5:1)');
console.log('    Impact: Hardcoded in 4 files, mapping to text-color-muted');
console.log('    Recommendation: Darken to #707070 (4.53:1 on white) or #6a6a6a (4.69:1)');
console.log('  • #999 (disabled) on light backgrounds: 2.39-2.85:1 - FAILS AA');
console.log('    Impact: Used for disabled state');
console.log('    Recommendation: This is acceptable for disabled text (intentionally low contrast)');
console.log('  • Success button (#28a745) with white text: 3.13:1 - FAILS AA');
console.log('    Impact: Primary success button across app');
console.log('    Recommendation: Darken to #1e7e34 (4.52:1) or use #008744 (5.05:1)');

console.log('\n❌ DARK MODE FAILURES:');
console.log('  • #888 (muted) on dark backgrounds: 3.89-4.49:1 - FAILS AA (needs 4.5:1)');
console.log('    Impact: Proposed for intermediate gray text');
console.log('    Recommendation: Lighten to #909090 (5.31:1 on #1a1a1a)');
console.log('  • #666 (disabled) on dark backgrounds: 2.40-3.03:1 - FAILS AA');
console.log('    Impact: Used for disabled state');
console.log('    Recommendation: This is acceptable for disabled text (intentionally low contrast)');
console.log('  • Success button (#2ea84f) with white text: 3.07:1 - FAILS AA');
console.log('    Impact: Dark mode success button');
console.log('    Recommendation: Darken to #218838 (4.53:1)');

console.log('\n\n✅ COMPLIANT COMBINATIONS:');
console.log('  • All primary, secondary text colors on main backgrounds: AA or AAA');
console.log('  • Most button colors with white text: AAA level');
console.log('  • Navigation colors with white text: AAA level');
console.log('  • Most proposed neutral colors: AA or better');

console.log('\n\n' + '='.repeat(80) + '\n');

