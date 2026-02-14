#!/usr/bin/env node

/**
 * Acronym Field Name Fixer
 * 
 * This script fixes field names that were incorrectly converted for acronyms.
 * Acronyms should be treated as single words in snake_case, not letter-by-letter.
 * 
 * Examples:
 *   u_r_l → url
 *   s_s_l → ssl
 *   a_i_ → ai_
 *   s_l_a_ → sla_
 *   
 * Usage:
 *   node scripts/fix-acronym-field-names.cjs
 */

const fs = require('fs');
const path = require('path');

// Mapping of incorrect acronym patterns to correct ones
const ACRONYM_FIXES = {
  'u_r_l': 'url',
  's_s_l': 'ssl',
  'a_i_': 'ai_',
  's_l_a_': 'sla_',
  'c_s_a_t_': 'csat_',
  'j_s_o_n': 'json',
  'i_p': 'ip',
  's_m_s_': 'sms_',
  'c_s_s': 'css',
  'a_p_i': 'api'
};

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
 * Fix acronyms in a file
 */
function fixAcronymsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const fixes = [];

  // Build field name specific patterns that match field definitions and references
  const replacements = [
    // URL patterns
    { from: /\bu_r_l(_|:|\b)/g, to: 'url$1', name: 'u_r_l → url' },
    { from: /form_u_r_l/g, to: 'form_url', name: 'form_u_r_l → form_url' },
    { from: /redirect_u_r_l/g, to: 'redirect_url', name: 'redirect_u_r_l → redirect_url' },
    { from: /logo_u_r_l/g, to: 'logo_url', name: 'logo_u_r_l → logo_url' },
    { from: /video_u_r_l/g, to: 'video_url', name: 'video_u_r_l → video_url' },
    { from: /thumbnail_u_r_l/g, to: 'thumbnail_url', name: 'thumbnail_u_r_l → thumbnail_url' },
    { from: /u_r_l_slug/g, to: 'url_slug', name: 'u_r_l_slug → url_slug' },
    
    // AI patterns - including use_a_i_ variants
    { from: /use_a_i_/g, to: 'use_ai_', name: 'use_a_i_ → use_ai_' },
    { from: /\ba_i_/g, to: 'ai_', name: 'a_i_ → ai_' },
    
    // SLA patterns - including allow_s_l_a_ variants
    { from: /allow_s_l_a_/g, to: 'allow_sla_', name: 'allow_s_l_a_ → allow_sla_' },
    { from: /\bs_l_a_/g, to: 'sla_', name: 's_l_a_ → sla_' },
    { from: /is_s_l_a_/g, to: 'is_sla_', name: 'is_s_l_a_ → is_sla_' },
    
    // VIP patterns
    { from: /\bv_i_p_/g, to: 'vip_', name: 'v_i_p_ → vip_' },
    
    // CSAT patterns
    { from: /\bc_s_a_t_/g, to: 'csat_', name: 'c_s_a_t_ → csat_' },
    
    // Other acronyms
    { from: /custom_c_s_s/g, to: 'custom_css', name: 'custom_c_s_s → custom_css' },
    { from: /use_s_s_l/g, to: 'use_ssl', name: 'use_s_s_l → use_ssl' },
    { from: /last_login_i_p/g, to: 'last_login_ip', name: 'last_login_i_p → last_login_ip' },
    { from: /\bs_m_s_/g, to: 'sms_', name: 's_m_s_ → sms_' },
    { from: /configuration_j_s_o_n/g, to: 'configuration_json', name: 'configuration_j_s_o_n → configuration_json' },
    { from: /public_a_p_i/g, to: 'public_api', name: 'public_a_p_i → public_api' }
  ];

  replacements.forEach(({ from, to, name }) => {
    const matches = [...content.matchAll(from)];
    if (matches.length > 0) {
      content = content.replace(from, to);
      fixes.push({ name, count: matches.length });
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return fixes;
}

/**
 * Main execution
 */
function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Acronym Field Name Fixer                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const baseDir = path.join(__dirname, '..');
  const packagesDir = path.join(baseDir, 'packages');
  
  const objectFiles = findObjectFiles(packagesDir);
  
  let totalFiles = 0;
  let totalFixes = 0;
  
  objectFiles.forEach(file => {
    const fixes = fixAcronymsInFile(file);
    if (fixes.length > 0) {
      console.log(`\n📝 ${path.basename(file)}`);
      fixes.forEach(fix => {
        console.log(`   ${fix.name} (${fix.count} occurrences)`);
        totalFixes += fix.count;
      });
      totalFiles++;
    }
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log(`✅ Fixed ${totalFixes} acronym issues in ${totalFiles} files`);
  console.log('═'.repeat(80));
}

if (require.main === module) {
  main();
}

module.exports = { fixAcronymsInFile };
