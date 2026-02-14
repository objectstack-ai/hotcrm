#!/usr/bin/env node

/**
 * Fix all uppercase enum values in code to lowercase
 * 
 * This script fixes hardcoded enum values in TypeScript code files
 * to match the lowercase values in object definitions per @objectstack/spec v1.0.0
 */

const fs = require('fs');
const path = require('path');

// Map of old values to new values
const VALUE_MAPPINGS = {
  // Opportunity stages
  "'Closed Won'": "'closed_won'",
  '"Closed Won"': '"closed_won"',
  "'Closed Lost'": "'closed_lost'",
  '"Closed Lost"': '"closed_lost"',
  "'Prospecting'": "'prospecting'",
  '"Prospecting"': '"prospecting"',
  
  // Lead/Case/Candidate statuses
  "'New'": "'new'",
  '"New"': '"new"',
  "'Contacted'": "'contacted'",
  '"Contacted"': '"contacted"',
  "'Qualified'": "'qualified'",
  '"Qualified"': '"qualified"',
  "'Converted'": "'converted'",
  '"Converted"': '"converted"',
  "'Under Review'": "'under_review'",
  '"Under Review"': '"under_review"',
  "'New Response'": "'new_response'",
  '"New Response"': '"new_response"',
  
  // Priorities
  "'Critical'": "'critical'",
  '"Critical"': '"critical"',
  "'High'": "'high'",
  '"High"': '"high"',
  "'Medium'": "'medium'",
  '"Medium"': '"medium"',
  "'Low'": "'low'",
  '"Low"': '"low"',
  
  // Origins
  "'Email'": "'email'",
  '"Email"': '"email"',
  "'Phone'": "'phone'",
  '"Phone"': '"phone"',
  "'Web'": "'web'",
  '"Web"': '"web"',
};

let totalReplacements = 0;
const modifiedFiles = new Set();

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  Object.entries(VALUE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (content.includes(oldValue)) {
      const count = (content.match(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 0) {
        content = content.replace(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newValue);
        totalReplacements += count;
        modified = true;
        console.log(`  ${oldValue} → ${newValue} (${count}x)`);
      }
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles.add(filePath);
  }
  
  return modified;
}

function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip dist, node_modules
      if (file !== 'dist' && file !== 'node_modules' && file !== '.git') {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('.object.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Fix Uppercase Enum Values in Code (@objectstack/spec v1.0.0)               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const packagesDir = path.join(process.cwd(), 'packages');
  const files = findTsFiles(packagesDir);
  
  console.log(`Scanning ${files.length} TypeScript files...\n`);
  
  files.forEach(file => {
    const modified = fixFile(file);
    if (modified) {
      console.log(`\n📝 Modified: ${path.relative(process.cwd(), file)}`);
    }
  });
  
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(`✅ Fixed ${totalReplacements} enum values in ${modifiedFiles.size} files\n`);
}

try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
