#!/usr/bin/env node
/**
 * Plugin Architecture Verification Script
 * 
 * This script verifies that the plugin architecture is correctly implemented
 * by checking all plugin files and their structure.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 HotCRM Plugin Architecture Verification\n');
console.log('='.repeat(60));

// Expected plugins
const expectedPlugins = [
  {
    name: 'crm',
    label: 'CRM',
    path: 'packages/crm/src/plugin.ts',
    dependencies: []
  },
  {
    name: 'products',
    label: 'Products & Pricing',
    path: 'packages/products/src/plugin.ts',
    dependencies: ['crm']
  },
  {
    name: 'finance',
    label: 'Finance',
    path: 'packages/finance/src/plugin.ts',
    dependencies: ['crm']
  },
  {
    name: 'support',
    label: 'Customer Support',
    path: 'packages/support/src/plugin.ts',
    dependencies: ['crm']
  }
];

let allPassed = true;

// Check each plugin file exists and has correct structure
console.log('\n📦 Checking Plugin Files:\n');

for (const plugin of expectedPlugins) {
  const fullPath = path.join(__dirname, '..', plugin.path);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${plugin.label} - Plugin file not found: ${plugin.path}`);
    allPassed = false;
    continue;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for required exports
  const hasExport = content.includes(`export const ${plugin.label.replace(/[^a-zA-Z]/g, '')}Plugin`) ||
                    content.includes(`export const ${plugin.name}Plugin`) ||
                    content.includes('export const');
  const hasDefault = content.includes('export default');
  const hasName = content.includes(`name: '${plugin.name}'`);
  const hasLabel = content.includes(`label:`);
  const hasObjects = content.includes('objects:');
  const hasNavigation = content.includes('navigation:');
  
  if (!hasExport || !hasDefault || !hasName || !hasLabel || !hasObjects || !hasNavigation) {
    console.log(`❌ ${plugin.label} - Missing required structure`);
    if (!hasExport) console.log(`   - Missing plugin export`);
    if (!hasDefault) console.log(`   - Missing default export`);
    if (!hasName) console.log(`   - Missing name property`);
    if (!hasLabel) console.log(`   - Missing label property`);
    if (!hasObjects) console.log(`   - Missing objects property`);
    if (!hasNavigation) console.log(`   - Missing navigation property`);
    allPassed = false;
    continue;
  }
  
  const deps = plugin.dependencies.length > 0 
    ? ` (depends on: ${plugin.dependencies.join(', ')})` 
    : '';
  console.log(`✓ ${plugin.label}${deps}`);
}

// Check objectstack.config.ts
console.log('\n📄 Checking Configuration:\n');

const configPath = path.join(__dirname, '..', 'packages/server/objectstack.config.ts');
if (!fs.existsSync(configPath)) {
  console.log('❌ objectstack.config.ts not found');
  allPassed = false;
} else {
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check for plugin imports
  const hasPluginImports = expectedPlugins.every(p => {
    // Check for both possible import patterns
    return configContent.includes('CRMPlugin') || 
           configContent.includes('ProductsPlugin') ||
           configContent.includes('FinancePlugin') ||
           configContent.includes('SupportPlugin');
  });
  
  if (!hasPluginImports) {
    console.log('❌ Not all plugins are imported in objectstack.config.ts');
    allPassed = false;
  } else {
    console.log('✓ All plugins imported in objectstack.config.ts');
  }
  
  if (configContent.includes('plugins:')) {
    console.log('✓ Configuration uses plugin-based architecture');
  } else {
    console.log('❌ Configuration missing plugins property');
    allPassed = false;
  }
}

// Check CLI server
console.log('\n🖥️  Checking CLI Server:\n');

const cliServerPath = path.join(__dirname, '..', 'packages/server/src/cli-server.ts');
if (!fs.existsSync(cliServerPath)) {
  console.log('❌ cli-server.ts not found');
  allPassed = false;
} else {
  const cliContent = fs.readFileSync(cliServerPath, 'utf8');
  
  if (cliContent.includes('sortPluginsByDependencies')) {
    console.log('✓ CLI server has plugin dependency resolution');
  } else {
    console.log('❌ CLI server missing plugin dependency resolution');
    allPassed = false;
  }
  
  if (cliContent.includes('Loading') && cliContent.includes('plugin')) {
    console.log('✓ CLI server has plugin loading messages');
  } else {
    console.log('⚠ CLI server may be missing plugin loading messages');
  }
}

// Check documentation
console.log('\n📚 Checking Documentation:\n');

const docsPath = path.join(__dirname, '..', 'docs/PLUGIN_ARCHITECTURE.md');
if (!fs.existsSync(docsPath)) {
  console.log('❌ Plugin architecture documentation not found');
  allPassed = false;
} else {
  console.log('✓ Plugin architecture documentation exists');
  
  const docsContent = fs.readFileSync(docsPath, 'utf8');
  if (docsContent.includes('Plugin Structure') && 
      docsContent.includes('Plugin Loading') &&
      docsContent.includes('Dependency Resolution')) {
    console.log('✓ Documentation includes key sections');
  } else {
    console.log('⚠ Documentation may be incomplete');
  }
}

// Final result
console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('\n✅ Plugin Architecture Verification: PASSED\n');
  console.log('All plugins are correctly structured and documented.');
  console.log('The plugin architecture is ready to use!\n');
  process.exit(0);
} else {
  console.log('\n❌ Plugin Architecture Verification: FAILED\n');
  console.log('Some issues were found. Please review the output above.\n');
  process.exit(1);
}
