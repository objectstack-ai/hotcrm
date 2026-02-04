#!/usr/bin/env node

/**
 * Scan Select Field Option Values for Protocol Compliance
 * 
 * According to @objectstack/spec v1.0.0:
 * - Select option values MUST be lowercase to avoid case-sensitivity issues
 * - This is a CRITICAL requirement defined in SelectOptionSchema
 */

const fs = require('fs');
const path = require('path');

const violations = [];
const stats = {
  filesScanned: 0,
  selectFieldsFound: 0,
  optionsChecked: 0,
  violationsFound: 0
};

function scanFile(filePath) {
  stats.filesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all Field.select or Field.multiselect usages
  const selectFieldRegex = /Field\.(select|multiselect)\s*\(\s*\{[\s\S]*?\}\s*\)/g;
  const matches = content.match(selectFieldRegex);
  
  if (!matches) return;
  
  matches.forEach(match => {
    stats.selectFieldsFound++;
    
    // Extract options array
    const optionsRegex = /options:\s*\[([\s\S]*?)\]/;
    const optionsMatch = match.match(optionsRegex);
    
    if (!optionsMatch) return;
    
    // Find all value properties
    const valueRegex = /value:\s*['"]([^'"]+)['"]/g;
    let valueMatch;
    
    while ((valueMatch = valueRegex.exec(optionsMatch[1])) !== null) {
      stats.optionsChecked++;
      const value = valueMatch[1];
      
      // Check if value is lowercase (allowing underscores and numbers)
      if (value !== value.toLowerCase()) {
        stats.violationsFound++;
        
        // Find field name for better error reporting
        const fieldNameRegex = /(\w+):\s*Field\.(select|multiselect)/;
        const fullContext = content.substring(
          Math.max(0, content.indexOf(match) - 100),
          content.indexOf(match) + match.length
        );
        const fieldNameMatch = fullContext.match(fieldNameRegex);
        const fieldName = fieldNameMatch ? fieldNameMatch[1] : 'unknown';
        
        violations.push({
          file: filePath,
          field: fieldName,
          value: value,
          suggestion: value.toLowerCase().replace(/\s+/g, '_')
        });
      }
    }
  });
}

// Find all .object.ts files recursively
function findObjectFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findObjectFiles(filePath, fileList);
    } else if (file.endsWith('.object.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Scan all .object.ts files
function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Select Option Value Protocol Compliance Scanner (@objectstack/spec v1.0.0)  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const packagesDir = path.join(process.cwd(), 'packages');
  const files = findObjectFiles(packagesDir);
  
  files.forEach(file => {
    scanFile(file);
  });
  
  console.log('📊 Scan Statistics:');
  console.log(`   Files scanned:        ${stats.filesScanned}`);
  console.log(`   Select fields found:  ${stats.selectFieldsFound}`);
  console.log(`   Options checked:      ${stats.optionsChecked}`);
  console.log(`   Violations found:     ${stats.violationsFound}\n`);
  
  if (violations.length > 0) {
    console.log('❌ PROTOCOL VIOLATIONS DETECTED\n');
    console.log('According to @objectstack/spec v1.0.0, select option values MUST be lowercase.');
    console.log('This is a CRITICAL requirement to avoid case-sensitivity issues in queries.\n');
    
    // Group by file
    const byFile = violations.reduce((acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    }, {});
    
    Object.entries(byFile).forEach(([file, fileViolations]) => {
      console.log(`\n📄 ${path.relative(process.cwd(), file)}`);
      fileViolations.forEach(v => {
        console.log(`   Field: ${v.field}`);
        console.log(`   ❌ Current: "${v.value}"`);
        console.log(`   ✅ Suggested: "${v.suggestion}"\n`);
      });
    });
    
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   1. Update all select option values to lowercase');
    console.log('   2. Use snake_case for multi-word values (e.g., "in_progress")');
    console.log('   3. Update any queries or code that references these values\n');
    
    process.exit(1);
  } else {
    console.log('✅ ALL SELECT OPTION VALUES ARE COMPLIANT\n');
    process.exit(0);
  }
}

try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
