// WCAG Contrast Ratio Calculator
// Based on WCAG 2.1 specifications

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

// Light Mode Colors
const lightMode = {
  backgrounds: {
    'primary (#ecebeb)': '#ecebeb',
    'secondary (#f1f1f1)': '#f1f1f1',
    'tertiary (#f0f0f0)': '#f0f0f0',
    'card (#ffffff)': '#ffffff',
    'nav (#08242c)': '#08242c'
  },
  text: {
    'primary (#333)': '#333333',
    'secondary (#555)': '#555555',
    'tertiary (#666)': '#666666',
    'muted (#777)': '#777777',
    'disabled (#999)': '#999999',
    'dark (#222)': '#222222',
    'on-dark-bg (#fff)': '#ffffff'
  },
  buttons: {
    'primary (#08242c)': '#08242c',
    'hover (#0f3e48)': '#0f3e48',
    'success (#28a745)': '#28a745',
    'delete (#4a1818)': '#4a1818',
    'save (#1b3442)': '#1b3442'
  },
  borders: {
    'primary (#ccc)': '#cccccc',
    'secondary (#ddd)': '#dddddd',
    'tertiary (#eee)': '#eeeeee'
  }
};

// Dark Mode Colors
const darkMode = {
  backgrounds: {
    'primary (#1a1a1a)': '#1a1a1a',
    'secondary (#222)': '#222222',
    'tertiary (#282828)': '#282828',
    'card (#2d2d2d)': '#2d2d2d',
    'nav (#0a2e3a)': '#0a2e3a'
  },
  text: {
    'primary (#e0e0e0)': '#e0e0e0',
    'secondary (#c0c0c0)': '#c0c0c0',
    'tertiary (#a0a0a0)': '#a0a0a0',
    'muted (#888)': '#888888',
    'disabled (#666)': '#666666',
    'dark (#f0f0f0)': '#f0f0f0',
    'on-dark-bg (#fff)': '#ffffff'
  },
  buttons: {
    'primary (#0a2e3a)': '#0a2e3a',
    'hover (#11505f)': '#11505f',
    'success (#2ea84f)': '#2ea84f',
    'delete (#5a1e1e)': '#5a1e1e',
    'save (#1f3e4e)': '#1f3e4e'
  },
  borders: {
    'primary (#444)': '#444444',
    'secondary (#3a3a3a)': '#3a3a3a',
    'tertiary (#333)': '#333333'
  }
};

console.log('\n' + '='.repeat(80));
console.log('WCAG 2.1 CONTRAST ANALYSIS - LIGHT MODE');
console.log('='.repeat(80));

console.log('\n📄 TEXT ON BACKGROUNDS (Normal Size)');
console.log('-'.repeat(80));
Object.entries(lightMode.backgrounds).forEach(([bgName, bgColor]) => {
  console.log(`\n${bgName} background:`);
  Object.entries(lightMode.text).forEach(([textName, textColor]) => {
    const ratio = getContrastRatio(textColor, bgColor);
    if (ratio) {
      const level = getWCAGLevel(ratio, false);
      const icon = level === 'AAA' ? '✅✅' : level === 'AA' ? '✅' : '❌';
      console.log(`  ${icon} ${textName.padEnd(25)} ${ratio.toFixed(2)}:1 - ${level}`);
    }
  });
});

console.log('\n\n🔘 BUTTONS (Text on Button Background)');
console.log('-'.repeat(80));
const buttonTextColor = lightMode.text['on-dark-bg (#fff)'];
Object.entries(lightMode.buttons).forEach(([btnName, btnColor]) => {
  const ratio = getContrastRatio(buttonTextColor, btnColor);
  if (ratio) {
    const level = getWCAGLevel(ratio, false);
    const icon = level === 'AAA' ? '✅✅' : level === 'AA' ? '✅' : '❌';
    console.log(`  ${icon} White text on ${btnName.padEnd(25)} ${ratio.toFixed(2)}:1 - ${level}`);
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('WCAG 2.1 CONTRAST ANALYSIS - DARK MODE');
console.log('='.repeat(80));

console.log('\n📄 TEXT ON BACKGROUNDS (Normal Size)');
console.log('-'.repeat(80));
Object.entries(darkMode.backgrounds).forEach(([bgName, bgColor]) => {
  console.log(`\n${bgName} background:`);
  Object.entries(darkMode.text).forEach(([textName, textColor]) => {
    const ratio = getContrastRatio(textColor, bgColor);
    if (ratio) {
      const level = getWCAGLevel(ratio, false);
      const icon = level === 'AAA' ? '✅✅' : level === 'AA' ? '✅' : '❌';
      console.log(`  ${icon} ${textName.padEnd(25)} ${ratio.toFixed(2)}:1 - ${level}`);
    }
  });
});

console.log('\n\n🔘 BUTTONS (Text on Button Background)');
console.log('-'.repeat(80));
const darkButtonTextColor = darkMode.text['on-dark-bg (#fff)'];
Object.entries(darkMode.buttons).forEach(([btnName, btnColor]) => {
  const ratio = getContrastRatio(darkButtonTextColor, btnColor);
  if (ratio) {
    const level = getWCAGLevel(ratio, false);
    const icon = level === 'AAA' ? '✅✅' : level === 'AA' ? '✅' : '❌';
    console.log(`  ${icon} White text on ${btnName.padEnd(25)} ${ratio.toFixed(2)}:1 - ${level}`);
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('WCAG 2.1 STANDARDS REFERENCE');
console.log('='.repeat(80));
console.log('\nNormal Text (< 18pt or < 14pt bold):');
console.log('  ✅✅ AAA: 7.0:1 or higher');
console.log('  ✅ AA:  4.5:1 or higher');
console.log('  ❌ FAIL: Below 4.5:1');
console.log('\nLarge Text (≥ 18pt or ≥ 14pt bold):');
console.log('  ✅✅ AAA: 4.5:1 or higher');
console.log('  ✅ AA:  3.0:1 or higher');
console.log('  ❌ FAIL: Below 3.0:1');

console.log('\n' + '='.repeat(80) + '\n');

