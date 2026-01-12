const fs = require('fs');
const path = require('path');

// Simple accessibility checks for HTML files
function checkAccessibility(html, filename) {
  const issues = [];
  
  // Check 1: Images without alt attributes
  const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
  if (imgWithoutAlt.length > 0) {
    issues.push(`Found ${imgWithoutAlt.length} <img> tags without alt attributes`);
  }
  
  // Check 2: Buttons without accessible names
  const buttonsWithoutLabel = html.match(/<button(?![^>]*aria-label)(?![^>]*>[\s\S]*?<\/button>)[^>]*\/>/gi) || [];
  
  // Check 3: Form inputs without labels or aria-label
  const inputsWithoutLabel = html.match(/<input(?![^>]*aria-label)(?![^>]*id=)[^>]*>/gi) || [];
  if (inputsWithoutLabel.length > 0) {
    issues.push(`Found ${inputsWithoutLabel.length} <input> elements that may lack labels`);
  }
  
  // Check 4: Links without text or aria-label
  const emptyLinks = html.match(/<a(?![^>]*aria-label)[^>]*>\s*<\/a>/gi) || [];
  if (emptyLinks.length > 0) {
    issues.push(`Found ${emptyLinks.length} empty <a> tags`);
  }
  
  // Check 5: Missing lang attribute on html
  if (!html.match(/<html[^>]*lang=/i)) {
    issues.push('Missing lang attribute on <html> element');
  }
  
  // Check 6: Check for ARIA roles
  const ariaRoles = html.match(/role="/gi) || [];
  const ariaLabels = html.match(/aria-label="/gi) || [];
  const ariaDescribedby = html.match(/aria-describedby="/gi) || [];
  
  console.log(`\n📊 Accessibility Report for ${filename}:`);
  console.log(`✅ ARIA roles found: ${ariaRoles.length}`);
  console.log(`✅ ARIA labels found: ${ariaLabels.length}`);
  console.log(`✅ ARIA describedby found: ${ariaDescribedby.length}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Issues found:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log(`\n✨ No major issues found!`);
  }
  
  return issues;
}

// Check build output
const buildDir = path.join(__dirname, 'build');
const indexPath = path.join(buildDir, 'index.html');

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  checkAccessibility(html, 'index.html');
} else {
  console.log('Build directory not found. Please run npm run build first.');
}
