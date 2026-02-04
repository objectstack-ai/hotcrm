#!/usr/bin/env node

/**
 * Auto-fix Select Field Option Values for Protocol Compliance
 * 
 * According to @objectstack/spec v1.0.0:
 * - Select option values MUST be lowercase to avoid case-sensitivity issues
 * - Multi-word values should use snake_case
 */

const fs = require('fs');
const path = require('path');

const fixes = {
  count: 0,
  files: new Set()
};

// Convert value to lowercase snake_case
function normalizeValue(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')      // spaces to underscores
    .replace(/[^a-z0-9_]/g, '') // remove special chars except underscore
    .replace(/_+/g, '_')        // collapse multiple underscores
    .replace(/^_|_$/g, '');     // trim leading/trailing underscores
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Find all Field.select or Field.multiselect usages
  const selectFieldRegex = /Field\.(select|multiselect)\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  
  content = content.replace(selectFieldRegex, (match, fieldType, fieldContent) => {
    // Find options array
    const optionsRegex = /(options:\s*\[)([\s\S]*?)(\])/;
    const optionsMatch = fieldContent.match(optionsRegex);
    
    if (!optionsMatch) return match;
    
    const [, optionsPrefix, optionsContent, optionsSuffix] = optionsMatch;
    
    // Fix all value properties
    const fixedOptions = optionsContent.replace(
      /value:\s*['"]([^'"]+)['"]/g,
      (valueMatch, value) => {
        const normalized = normalizeValue(value);
        if (normalized !== value) {
          fixes.count++;
          fixes.files.add(filePath);
          modified = true;
          console.log(`  ✓ ${value} → ${normalized}`);
        }
        return `value: '${normalized}'`;
      }
    );
    
    const fixedFieldContent = fieldContent.replace(
      optionsContent,
      fixedOptions
    );
    
    return `Field.${fieldType}({${fixedFieldContent}})`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return modified;
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

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Auto-fix Select Option Values (@objectstack/spec v1.0.0)                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const packagesDir = path.join(process.cwd(), 'packages');
  const files = findObjectFiles(packagesDir);
  
  console.log(`Found ${files.length} object files\n`);
  
  files.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    const modified = fixFile(file);
    if (modified) {
      console.log(`\n📝 Modified: ${relativePath}`);
    }
  });
  
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(`✅ Fixed ${fixes.count} select option values in ${fixes.files.size} files\n`);
  
  if (fixes.files.size > 0) {
    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Review the changes to ensure they are correct');
    console.log('   2. Update any code that references these values');
    console.log('   3. Update test data to use new lowercase values');
    console.log('   4. Run tests to verify everything still works');
    console.log('   5. Run: node scripts/scan-select-values.js to verify compliance\n');
  }
}

try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
