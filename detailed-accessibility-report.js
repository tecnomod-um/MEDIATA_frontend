const fs = require('fs');
const path = require('path');

function getDetailedAnalysis(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check for various accessibility patterns
  const hasButtons = content.includes('<button') || content.includes('Button');
  const hasInputs = content.includes('<input') || content.includes('Input');
  const hasLinks = content.includes('<a ') || content.includes('Link');
  const hasImages = content.includes('<img');
  const hasForms = content.includes('<form');
  const hasModals = content.includes('modal') || content.includes('Modal');
  const hasTooltips = content.includes('tooltip') || content.includes('Tooltip');
  
  const hasAriaLabels = content.includes('aria-label');
  const hasAriaRoles = content.includes('role=');
  const hasIds = /\sid=["'][^"']+["']/.test(content);
  const hasNames = /\sname=["'][^"']+["']/.test(content);
  
  const interactiveElements = [hasButtons, hasInputs, hasLinks, hasModals].filter(Boolean).length;
  const accessibilityFeatures = [hasAriaLabels, hasAriaRoles, hasIds, hasNames].filter(Boolean).length;
  
  const needsWork = interactiveElements > 0 && accessibilityFeatures === 0;
  
  return {
    fileName,
    filePath: filePath.replace(/.*\/src\//, 'src/'),
    hasButtons,
    hasInputs,
    hasLinks,
    hasForms,
    hasImages,
    hasModals,
    hasTooltips,
    hasAriaLabels,
    hasAriaRoles,
    hasIds,
    hasNames,
    interactiveElements,
    accessibilityFeatures,
    needsWork,
    priority: needsWork ? (hasForms || hasModals ? 'HIGH' : 'MEDIUM') : 'LOW'
  };
}

function scanDirectory(dir) {
  const results = [];
  
  function scan(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('build') && !file.includes('Unused')) {
        scan(fullPath);
      } else if (file.endsWith('.js') && !file.includes('spec') && !file.includes('test') && !file.includes('index.js')) {
        results.push(getDetailedAnalysis(fullPath));
      }
    });
  }
  
  scan(dir);
  return results;
}

const srcDir = path.join(__dirname, 'src');
const results = scanDirectory(srcDir);

const highPriority = results.filter(r => r.priority === 'HIGH' && r.needsWork).sort((a, b) => b.interactiveElements - a.interactiveElements);
const mediumPriority = results.filter(r => r.priority === 'MEDIUM' && r.needsWork);

console.log('\n🔴 HIGH PRIORITY - Forms/Modals without accessibility:\n');
highPriority.forEach((r, i) => {
  console.log(`${i + 1}. ${r.fileName}`);
  console.log(`   Path: ${r.filePath}`);
  console.log(`   Has: ${r.hasForms ? 'Forms ' : ''}${r.hasModals ? 'Modals ' : ''}${r.hasInputs ? 'Inputs ' : ''}${r.hasButtons ? 'Buttons' : ''}`);
  console.log('');
});

console.log(`\n🟡 MEDIUM PRIORITY - Interactive elements without accessibility: ${mediumPriority.length} files\n`);
mediumPriority.slice(0, 10).forEach((r, i) => {
  console.log(`${i + 1}. ${r.fileName.padEnd(35)} - ${r.filePath}`);
});

const hasGoodAccessibility = results.filter(r => !r.needsWork && r.interactiveElements > 0);
console.log(`\n\n✅ Already Good: ${hasGoodAccessibility.length} interactive components with accessibility\n`);

console.log(`\n📈 Summary:`);
console.log(`   Total files analyzed: ${results.length}`);
console.log(`   High priority: ${highPriority.length}`);
console.log(`   Medium priority: ${mediumPriority.length}`);
console.log(`   Already accessible: ${hasGoodAccessibility.length}`);
console.log(`   Non-interactive: ${results.filter(r => r.interactiveElements === 0).length}`);

