#!/usr/bin/env node
/**
 * patch-console-plugin.cjs
 *
 * Prepares node_modules for Vercel deployment.
 *
 * pnpm uses symlinks in node_modules which Vercel rejects as
 * "invalid deployment package … symlinked directories". This script
 * replaces ALL top-level symlinks with real copies of the target
 * directories so that Vercel can bundle the serverless function.
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
    return true;
  }

  const realPath = fs.realpathSync(abs);
  console.log(`  → Dereferencing ${pkgPath}`);

  // Copy to a temp location first, then swap — avoids data loss if cpSync fails
  const tmpPath = abs + '.tmp';
  fs.cpSync(realPath, tmpPath, { recursive: true });
  fs.unlinkSync(abs);
  fs.renameSync(tmpPath, abs);
  return true;
}

/**
 * Walk a directory and dereference all symlinks found at the top level.
 * Handles scoped packages (@scope/pkg) by walking one level deeper.
 */
function derefAllSymlinks(nmDir) {
  const abs = path.resolve(ROOT, nmDir);
  if (!fs.existsSync(abs)) return 0;

  let count = 0;
  for (const entry of fs.readdirSync(abs)) {
    // Skip the .pnpm virtual store and hidden files
    if (entry === '.pnpm' || entry.startsWith('.')) continue;

    const entryPath = path.join(abs, entry);

    // Scoped package — walk one level deeper
    if (entry.startsWith('@')) {
      if (!fs.existsSync(entryPath)) continue;
      for (const sub of fs.readdirSync(entryPath)) {
        const rel = path.join(nmDir, entry, sub);
        if (derefSymlink(rel)) count++;
      }
      continue;
    }

    const rel = path.join(nmDir, entry);
    if (derefSymlink(rel)) count++;
  }
  return count;
}

console.log('\n🔧 Patching pnpm symlinks for Vercel deployment…\n');

const count = derefAllSymlinks('node_modules');
console.log(`\n✅ Patch complete — processed ${count} packages\n`);
