#!/usr/bin/env node

/**
 * Foreign Key Reference Fixer
 * 
 * This script converts all foreignKey references in relationships from PascalCase to snake_case.
 * 
 * Usage:
 *   node scripts/fix-foreign-keys.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert PascalCase to snake_case
 */
function pascalToSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase()
    .replace(/_+/g, '_');
}

/**
 * Find all object files
 */
function findObjectFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.object.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Fix foreign keys in a file
 */
function fixForeignKeysInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Find all foreignKey references with PascalCase values
  const foreignKeyPattern = /foreignKey:\s*['"]([A-Z][A-Za-z0-9_]*)['\"]/g;
  const matches = [...content.matchAll(foreignKeyPattern)];
  
  if (matches.length === 0) {
    return { fixed: 0, keys: [] };
  }
  
  const fixedKeys = [];
  matches.forEach(match => {
    const oldKey = match[1];
    const newKey = pascalToSnakeCase(oldKey);
    
    if (oldKey !== newKey) {
      // Replace this specific foreignKey reference
      content = content.replace(
        new RegExp(`(foreignKey:\\s*['"])${oldKey}(['"])`, 'g'),
        `$1${newKey}$2`
      );
      fixedKeys.push({ old: oldKey, new: newKey });
    }
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return { fixed: fixedKeys.length, keys: fixedKeys };
}

/**
 * Main execution
 */
function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Foreign Key Reference Fixer: PascalCase → snake_case                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const baseDir = path.join(__dirname, '..');
  const packagesDir = path.join(baseDir, 'packages');
  
  const objectFiles = findObjectFiles(packagesDir);
  
  let totalFixed = 0;
  const results = [];
  
  objectFiles.forEach(file => {
    const result = fixForeignKeysInFile(file);
    if (result.fixed > 0) {
      console.log(`📝 ${path.basename(file)}`);
      result.keys.forEach(k => {
        console.log(`   ${k.old} → ${k.new}`);
      });
      totalFixed += result.fixed;
      results.push({
        file: path.basename(file),
        count: result.fixed
      });
    }
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log(`✅ Fixed ${totalFixed} foreign key references in ${results.length} files`);
  console.log('═'.repeat(80));
}

if (require.main === module) {
  main();
}

module.exports = { fixForeignKeysInFile };
