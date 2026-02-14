/**
 * Patch @object-ui/console for Node.js compatibility.
 *
 * The published package exposes a TypeScript entry point (plugin.ts).
 * Node.js cannot execute .ts files natively, so we transpile it to
 * JavaScript and update the package exports before deployment.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const consolePkgDir = path.resolve(__dirname, '..', 'node_modules', '@object-ui', 'console');
const pkgJsonPath = path.join(consolePkgDir, 'package.json');
const pluginTs = path.join(consolePkgDir, 'plugin.ts');
const pluginJs = path.join(consolePkgDir, 'plugin.js');

if (!fs.existsSync(pluginTs)) {
  console.log('[patch-console-plugin] plugin.ts not found, skipping.');
  process.exit(0);
}

if (fs.existsSync(pluginJs)) {
  console.log('[patch-console-plugin] plugin.js already exists, skipping.');
  process.exit(0);
}

// 1. Transpile plugin.ts → plugin.js using TypeScript compiler API (strip types)
//    We use a simple regex-based approach since the file only uses standard ESM
//    syntax with type annotations.
console.log('[patch-console-plugin] Transpiling plugin.ts → plugin.js ...');

try {
  // Try using tsc via npx first
  execSync(
    `npx tsc --outDir "${consolePkgDir}" --declaration false --module nodenext --moduleResolution nodenext --target es2022 --esModuleInterop true --skipLibCheck true "${pluginTs}"`,
    { stdio: 'inherit' }
  );
} catch {
  // Fallback: manual transpilation (the file has no complex TS features)
  console.log('[patch-console-plugin] tsc failed, using manual transpilation ...');
  let source = fs.readFileSync(pluginTs, 'utf-8');
  // Remove type annotations: `: any`, `: string`, `: Record<...>`, `as const`
  source = source
    .replace(/:\s*Record<string,\s*string>\s*=/g, ' =')
    .replace(/\bas const\b/g, '')
    .replace(/:\s*any/g, '')
    .replace(/:\s*string/g, '');
  fs.writeFileSync(pluginJs, source, 'utf-8');
}

// 2. Update package.json to point to plugin.js
console.log('[patch-console-plugin] Updating package.json exports ...');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
pkg.main = './plugin.js';
if (pkg.exports && pkg.exports['.']) {
  pkg.exports['.'] = {
    import: './plugin.js',
    default: './plugin.js',
  };
}
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

console.log('[patch-console-plugin] Done.');
