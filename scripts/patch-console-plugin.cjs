#!/usr/bin/env node
/**
 * patch-console-plugin.cjs
 *
 * Prepares @object-ui/console and @objectstack/studio for Vercel deployment.
 *
 * pnpm uses symlinks in node_modules which Vercel rejects as
 * "invalid deployment package … symlinked directories". This script
 * replaces the symlinks with real copies of the packages so that
 * Vercel's includeFiles glob can bundle their dist/ assets into the
 * serverless function.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Replace a pnpm symlink with a real copy of the target directory.
 */
function derefSymlink(pkgPath) {
  const abs = path.resolve(ROOT, pkgPath);
  if (!fs.existsSync(abs)) {
    console.warn(`  ⚠ ${pkgPath} not found — skipping`);
    return false;
  }

  const stat = fs.lstatSync(abs);
  if (!stat.isSymbolicLink()) {
    console.log(`  ✓ ${pkgPath} is already a real directory`);
    return true;
  }

  const realPath = fs.realpathSync(abs);
  console.log(`  → Dereferencing ${pkgPath}`);
  console.log(`    symlink target: ${realPath}`);

  // Copy to a temp location first, then swap — avoids data loss if cpSync fails
  const tmpPath = abs + '.tmp';
  fs.cpSync(realPath, tmpPath, { recursive: true });
  fs.unlinkSync(abs);
  fs.renameSync(tmpPath, abs);
  console.log(`  ✓ Replaced symlink with real copy`);
  return true;
}

console.log('\n🔧 Patching UI packages for Vercel deployment…\n');

derefSymlink('node_modules/@object-ui/console');
derefSymlink('node_modules/@objectstack/studio');

console.log('\n✅ Patch complete\n');
