#!/usr/bin/env node
/**
 * fix-esm-imports.cjs
 *
 * Adds `.js` extensions to relative import/export specifiers in TypeScript
 * source files. Required for TypeScript ESM with `module: "Node16"`, which
 * mandates explicit `.js` extensions on relative imports (even in `.ts` files).
 *
 * This script is intended to be run ONCE to migrate source files.
 * After migration the build pipeline no longer needs any post-processing.
 *
 * Usage:
 *   node scripts/fix-esm-imports.cjs [dir]
 *   (defaults to packages)
 */
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'packages';
const root = path.resolve(process.cwd(), targetDir);

// Known JavaScript/JSON file extensions that should NOT be double-suffixed.
const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.node', '.ts', '.mts', '.cts', '.tsx', '.jsx']);

// Matches relative import/export specifiers:
//   import { X } from './foo'        → './foo.js'
//   export { X } from '../bar'       → '../bar.js'
//   export * from './baz'            → './baz.js'
//   import type { X } from './foo'   → './foo.js'
const IMPORT_RE = /((?:import|export)\s+.*?from\s+['"])(\.\.?\/[^'"]*?)(['"])/g;
const DYNAMIC_RE = /(import\(\s*['"])(\.\.?\/[^'"]*?)(['"]\s*\))/g;

function hasJsExtension(specifier) {
  const ext = path.extname(specifier);
  return JS_EXTENSIONS.has(ext);
}

function resolveSpecifier(filePath, specifier) {
  const dir = path.dirname(filePath);
  const resolved = path.resolve(dir, specifier);

  // Check if it's a directory with index.ts
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    // Check for index.ts or index.js
    if (fs.existsSync(path.join(resolved, 'index.ts')) || fs.existsSync(path.join(resolved, 'index.js'))) {
      return specifier + '/index.js';
    }
  }

  // Default: append .js
  return specifier + '.js';
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  function replacer(_match, prefix, specifier, suffix) {
    if (hasJsExtension(specifier)) return _match;
    const fixed = resolveSpecifier(filePath, specifier);
    changed = true;
    return prefix + fixed + suffix;
  }

  content = content.replace(IMPORT_RE, replacer);
  content = content.replace(DYNAMIC_RE, replacer);

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return changed;
}

function walk(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
      count += walk(full);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      if (fixFile(full)) count++;
    }
  }
  return count;
}

if (!fs.existsSync(root)) {
  console.error(`Directory not found: ${root}`);
  process.exit(1);
}

const fixed = walk(root);
console.log(`✓ Fixed ESM imports in ${fixed} source file(s)`);

