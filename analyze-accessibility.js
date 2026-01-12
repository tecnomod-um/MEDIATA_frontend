const fs = require('fs');
const path = require('path');

function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  const stats = {
    ariaLabels: (content.match(/aria-label=/g) || []).length,
    ariaDescribedby: (content.match(/aria-describedby=/g) || []).length,
    ariaRoles: (content.match(/role=/g) || []).length,
    ariaLive: (content.match(/aria-live=/g) || []).length,
    ariaExpanded: (content.match(/aria-expanded=/g) || []).length,
    ariaControls: (content.match(/aria-controls=/g) || []).length,
    ariaRequired: (content.match(/aria-required=/g) || []).length,
    ariaInvalid: (content.match(/aria-invalid=/g) || []).length,
    ids: (content.match(/\sid=/g) || []).length,
    names: (content.match(/\sname=/g) || []).length,
    alts: (content.match(/\salt=/g) || []).length,
  };
  
  return { fileName, stats };
}

function scanDirectory(dir) {
  const results = [];
  
  function scan(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('build')) {
        scan(fullPath);
      } else if (file.endsWith('.js') && !file.includes('spec') && !file.includes('test')) {
        results.push(analyzeComponent(fullPath));
      }
    });
  }
  
  scan(dir);
  return results;
}

// Scan components and pages
const srcDir = path.join(__dirname, 'src');
const results = scanDirectory(srcDir);

// Aggregate stats
const totals = {
  ariaLabels: 0,
  ariaDescribedby: 0,
  ariaRoles: 0,
  ariaLive: 0,
  ariaExpanded: 0,
  ariaControls: 0,
  ariaRequired: 0,
  ariaInvalid: 0,
  ids: 0,
  names: 0,
  alts: 0,
};

results.forEach(r => {
  Object.keys(totals).forEach(key => {
    totals[key] += r.stats[key];
  });
});

console.log('\n📊 ACCESSIBILITY AUDIT RESULTS\n');
console.log('=' .repeat(60));
console.log('\n🎯 Total Accessibility Attributes Found:\n');
console.log(`  ARIA Labels:        ${totals.ariaLabels}`);
console.log(`  ARIA Describedby:   ${totals.ariaDescribedby}`);
console.log(`  ARIA Roles:         ${totals.ariaRoles}`);
console.log(`  ARIA Live:          ${totals.ariaLive}`);
console.log(`  ARIA Expanded:      ${totals.ariaExpanded}`);
console.log(`  ARIA Controls:      ${totals.ariaControls}`);
console.log(`  ARIA Required:      ${totals.ariaRequired}`);
console.log(`  ARIA Invalid:       ${totals.ariaInvalid}`);
console.log(`  ID attributes:      ${totals.ids}`);
console.log(`  Name attributes:    ${totals.names}`);
console.log(`  Alt attributes:     ${totals.alts}`);

console.log('\n' + '='.repeat(60));

// Find files with good accessibility
const goodAccessibility = results.filter(r => 
  r.stats.ariaLabels > 0 || r.stats.ariaRoles > 0
).sort((a, b) => {
  const aTotal = Object.values(a.stats).reduce((sum, val) => sum + val, 0);
  const bTotal = Object.values(b.stats).reduce((sum, val) => sum + val, 0);
  return bTotal - aTotal;
});

console.log(`\n✅ Files with Accessibility Attributes (${goodAccessibility.length} files):\n`);
goodAccessibility.slice(0, 10).forEach(r => {
  const total = Object.values(r.stats).reduce((sum, val) => sum + val, 0);
  console.log(`  ${r.fileName.padEnd(40)} - ${total} attributes`);
});

// Find files with no accessibility
const noAccessibility = results.filter(r => 
  r.stats.ariaLabels === 0 && r.stats.ariaRoles === 0 && r.stats.ids === 0
);

console.log(`\n⚠️  Files Needing Accessibility Work (${noAccessibility.length} files):\n`);
noAccessibility.slice(0, 15).forEach(r => {
  console.log(`  ${r.fileName}`);
});

console.log('\n' + '='.repeat(60) + '\n');

