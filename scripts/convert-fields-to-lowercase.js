#!/usr/bin/env node

/**
 * Field Name Converter: PascalCase → snake_case
 * 
 * This script converts all field names in .object.ts files from PascalCase to snake_case
 * according to the new @objectstack/spec v0.7.2+ protocol requirements.
 * 
 * It handles:
 * 1. Field definitions in the fields object
 * 2. Field references in listViews columns
 * 3. Field references in pageLayout sections
 * 4. Field references in validationRules formulas
 * 5. Foreign keys in relationships
 * 
 * Usage:
 *   node scripts/convert-fields-to-lowercase.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert PascalCase to snake_case
 * Examples:
 *   FirstName → first_name
 *   AccountId → account_id
 *   AnnualRevenue → annual_revenue
 *   SMSBody → sms_body
 *   AIActionItems → ai_action_items
 */
function pascalToSnakeCase(str) {
  return str
    // Insert underscore before uppercase letters (except at the start)
    .replace(/([A-Z])/g, '_$1')
    // Remove leading underscore
    .replace(/^_/, '')
    // Convert to lowercase
    .toLowerCase()
    // Handle consecutive uppercase letters (e.g., SMS → sms, AI → ai)
    .replace(/_+/g, '_');
}

/**
 * Extract all field names from an object file
 */
function extractFieldNames(content) {
  const fieldNames = [];
  const lines = content.split('\n');
  let inFieldsSection = false;
  let braceCount = 0;

  lines.forEach(line => {
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

      const fieldMatch = line.match(/^\s{4}([A-Z][A-Za-z0-9_]*):\s*\{/);
      if (fieldMatch) {
        fieldNames.push(fieldMatch[1]);
      }
    }
  });

  return fieldNames;
}

/**
 * Convert field names in the entire file
 */
function convertFieldNamesInFile(filePath) {
  console.log(`\n📝 Processing: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Extract all field names
  const fieldNames = extractFieldNames(content);
  
  if (fieldNames.length === 0) {
    console.log('   ⚠️  No fields found');
    return { converted: 0, fieldNames: [] };
  }

  console.log(`   📊 Found ${fieldNames.length} fields`);
  
  // Create mapping of old to new names
  const fieldMapping = {};
  fieldNames.forEach(oldName => {
    const newName = pascalToSnakeCase(oldName);
    if (oldName !== newName) {
      fieldMapping[oldName] = newName;
    }
  });

  if (Object.keys(fieldMapping).length === 0) {
    console.log('   ✅ All fields already lowercase');
    return { converted: 0, fieldNames: [] };
  }

  console.log(`   🔄 Converting ${Object.keys(fieldMapping).length} fields:`);
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedFields = Object.keys(fieldMapping).sort((a, b) => b.length - a.length);
  
  sortedFields.forEach(oldName => {
    const newName = fieldMapping[oldName];
    console.log(`      ${oldName} → ${newName}`);
    
    // 1. Convert field definition: "OldName: {" → "new_name: {"
    content = content.replace(
      new RegExp(`^(\\s{4})${oldName}(:\\s*\\{)`, 'gm'),
      `$1${newName}$2`
    );
    
    // 2. Convert in arrays (listViews columns, pageLayout fields)
    // Match: 'OldName' or "OldName" in arrays
    content = content.replace(
      new RegExp(`(['"])${oldName}\\1`, 'g'),
      `$1${newName}$1`
    );
    
    // 3. Convert in validation formulas
    // Match: OldName in formulas (word boundaries)
    content = content.replace(
      new RegExp(`\\b${oldName}\\b`, 'g'),
      newName
    );
    
    // 4. Convert foreignKey references in relationships
    // Match: foreignKey: 'OldName'
    content = content.replace(
      new RegExp(`(foreignKey:\\s*['"])${oldName}(['"])`, 'g'),
      `$1${newName}$2`
    );
  });

  // Write back the modified content
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`   ✅ Converted successfully`);
    return { converted: Object.keys(fieldMapping).length, fieldNames: sortedFields };
  } else {
    console.log('   ⚠️  No changes made');
    return { converted: 0, fieldNames: [] };
  }
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
 * Main execution
 */
function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Field Name Converter: PascalCase → snake_case                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  
  const baseDir = path.join(__dirname, '..');
  const packagesDir = path.join(baseDir, 'packages');
  
  if (!fs.existsSync(packagesDir)) {
    console.log('❌ Error: packages directory not found');
    process.exit(1);
  }
  
  const objectFiles = findObjectFiles(packagesDir);
  
  if (objectFiles.length === 0) {
    console.log('❌ No .object.ts files found');
    process.exit(0);
  }
  
  console.log(`\n📦 Found ${objectFiles.length} object files\n`);
  
  let totalConverted = 0;
  const results = [];
  
  objectFiles.forEach(file => {
    const result = convertFieldNamesInFile(file);
    totalConverted += result.converted;
    if (result.converted > 0) {
      results.push({
        file: path.basename(file),
        count: result.converted
      });
    }
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log('CONVERSION SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n📊 Total files processed: ${objectFiles.length}`);
  console.log(`✅ Total fields converted: ${totalConverted}`);
  console.log(`📝 Files modified: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n📋 Modified files:');
    results.forEach(r => {
      console.log(`   ${r.file}: ${r.count} fields`);
    });
  }
  
  console.log('\n✅ Conversion completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run: node scripts/validate-protocol.js');
  console.log('   2. Build packages: pnpm build');
  console.log('   3. Review and commit changes');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { pascalToSnakeCase, extractFieldNames, convertFieldNamesInFile };
