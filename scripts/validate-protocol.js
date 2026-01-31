#!/usr/bin/env node

/**
 * ObjectStack Spec v0.7.2+ Protocol Compliance Validator
 * 
 * This script validates all .object.ts files in the repository against
 * the @objectstack/spec v0.7.2+ protocol requirements.
 * 
 * IMPORTANT: Field names must be lowercase/snake_case (e.g., first_name, account_id)
 * 
 * Usage:
 *   node scripts/validate-protocol.js
 * 
 * Exit codes:
 *   0 - All objects are compliant
 *   1 - One or more objects have compliance issues
 */

const fs = require('fs');
const path = require('path');

// Valid field types according to @objectstack/spec v0.7.1
const VALID_FIELD_TYPES = new Set([
  'text', 'textarea', 'email', 'phone', 'url', 'password',
  'markdown', 'html', 'richtext',
  'number', 'currency', 'percent',
  'date', 'datetime', 'time',
  'boolean', 'toggle',
  'checkbox', 'select', 'multiselect', 'radio', 'checkboxes',
  'lookup', 'master_detail', 'tree',
  'autonumber', 'formula', 'summary',
  'location', 'address',
  'file', 'image', 'avatar', 'video', 'audio',
  'code', 'json', 'color', 'rating', 'slider',
  'signature', 'qrcode', 'progress', 'tags', 'vector'
]);

// Invalid field types and their correct alternatives
const INVALID_FIELD_TYPES = {
  'autoNumber': 'autonumber',  // Changed in v0.7.1
  'picklist': 'select',
  'reference': 'lookup',
  'masterDetail': 'master_detail'
};

// Valid relationship types
const VALID_RELATIONSHIP_TYPES = new Set(['hasMany', 'hasOne', 'belongsTo']);

function isLowercaseSnakeCase(name) {
  // Field names must be lowercase with optional underscores (snake_case)
  // Examples: name, first_name, account_id, annual_revenue
  return /^[a-z][a-z0-9_]*$/.test(name);
}

function analyzeObjectFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  const result = {
    file: fileName,
    objectName: '',
    fieldCount: 0,
    relationshipCount: 0,
    issues: [],
    warnings: [],
    fieldNames: [],
    fieldTypes: new Set()
  };

  // Extract object name
  const nameMatch = content.match(/name:\s*'([^']+)'/);
  if (nameMatch) {
    result.objectName = nameMatch[1];
    // Check if object name is lowercase/snake_case (machine name convention)
    if (!/^[a-z][a-z0-9_]*$/.test(result.objectName)) {
      result.issues.push(`Object name '${result.objectName}' must be lowercase/snake_case (e.g., 'account', 'project_task')`);
    }
  } else {
    result.issues.push('Missing required "name" property');
  }

  // Check for required properties
  if (!content.includes('label:')) {
    result.warnings.push('Missing "label" property');
  }
  if (!content.includes('icon:')) {
    result.warnings.push('Missing "icon" property');
  }

  // Count and validate fields
  let inFieldsSection = false;
  let braceCount = 0;
  
  content.split('\n').forEach(line => {
    if (line.match(/^\s*fields:\s*\{/)) {
      inFieldsSection = true;
      braceCount = 1;
      return;
    }
    
    if (inFieldsSection) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0) {
        inFieldsSection = false;
        return;
      }
      
      const fieldMatch = line.match(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*\{/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        result.fieldNames.push(fieldName);
        result.fieldCount++;
        
        if (!isLowercaseSnakeCase(fieldName)) {
          result.issues.push(`Field '${fieldName}' must be lowercase/snake_case (e.g., 'first_name', 'account_id')`);
        }
      }
    }
  });

  // Extract and validate field types
  const typeMatches = content.matchAll(/type:\s*'([^']+)'/g);
  for (const match of typeMatches) {
    const type = match[1];
    result.fieldTypes.add(type);
    
    if (!['hasMany', 'hasOne', 'belongsTo'].includes(type)) {
      if (INVALID_FIELD_TYPES[type]) {
        result.issues.push(`Invalid field type '${type}', should be '${INVALID_FIELD_TYPES[type]}'`);
      } else if (!VALID_FIELD_TYPES.has(type)) {
        result.warnings.push(`Unknown field type '${type}'`);
      }
    }
  }

  // Count relationships
  const relationshipsMatch = content.match(/relationships:\s*\[([^]*?)\]/);
  if (relationshipsMatch) {
    const relCount = (relationshipsMatch[1].match(/\{/g) || []).length;
    result.relationshipCount = relCount;
  }

  return result;
}

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

function printHeader() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║ ObjectStack Spec v0.7.2+ Protocol Compliance Validator'.padEnd(79) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');
}

function printObjectResult(result) {
  console.log(`\n┌─ ${result.file}`);
  console.log(`│  Name: ${result.objectName}`);
  console.log(`│  Fields: ${result.fieldCount}`);
  console.log(`│  Relationships: ${result.relationshipCount}`);
  
  if (result.issues.length > 0) {
    console.log(`│  ❌ Issues (${result.issues.length}):`);
    result.issues.forEach(i => console.log(`│     • ${i}`));
  }
  
  if (result.warnings.length > 0) {
    console.log(`│  ⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(w => console.log(`│     • ${w}`));
  }
  
  if (result.issues.length === 0 && result.warnings.length === 0) {
    console.log(`│  ✅ Fully compliant`);
  }
  
  console.log(`└${'─'.repeat(76)}`);
}

function printSummary(results) {
  console.log('\n' + '═'.repeat(78));
  console.log('VALIDATION SUMMARY');
  console.log('═'.repeat(78));

  const totalFields = results.reduce((sum, r) => sum + r.fieldCount, 0);
  const totalRelationships = results.reduce((sum, r) => sum + r.relationshipCount, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const compliantCount = results.filter(r => r.issues.length === 0 && r.warnings.length === 0).length;

  console.log(`\nObjects validated:     ${results.length}`);
  console.log(`Total fields:          ${totalFields}`);
  console.log(`Total relationships:   ${totalRelationships}`);
  console.log(`\nCritical issues:       ${totalIssues}`);
  console.log(`Warnings:              ${totalWarnings}`);
  console.log(`Compliant objects:     ${compliantCount}/${results.length}`);

  // List all field types used
  const allTypes = new Set();
  results.forEach(r => r.fieldTypes.forEach(t => allTypes.add(t)));
  console.log(`\nField types used (${allTypes.size}):`);
  [...allTypes].sort().forEach(t => {
    const isValid = VALID_FIELD_TYPES.has(t) || VALID_RELATIONSHIP_TYPES.has(t);
    const symbol = isValid ? '✓' : '✗';
    console.log(`  ${symbol} ${t}`);
  });

  if (totalIssues === 0) {
    console.log('\n✅ ALL OBJECTS COMPLIANT WITH @objectstack/spec v0.7.2+');
    console.log('\nProtocol Requirements Met:');
    console.log('  ✓ All field names use lowercase/snake_case');
    console.log('  ✓ All field types are valid');
    console.log('  ✓ All object definitions follow the standard structure');
    return true;
  } else {
    console.log('\n❌ COMPLIANCE VALIDATION FAILED');
    console.log('\nPlease fix the above issues to ensure protocol compliance.');
    return false;
  }
}

// Main execution
function main() {
  printHeader();
  
  const baseDir = path.join(__dirname, '..');
  const packagesDir = path.join(baseDir, 'packages');
  
  if (!fs.existsSync(packagesDir)) {
    console.log('Error: packages directory not found');
    process.exit(1);
  }
  
  const objectFiles = findObjectFiles(packagesDir);
  
  if (objectFiles.length === 0) {
    console.log('No .object.ts files found');
    process.exit(0);
  }
  
  const results = objectFiles.map(analyzeObjectFile);
  results.forEach(printObjectResult);
  
  const success = printSummary(results);
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeObjectFile, findObjectFiles };
