/**
 * Patch @object-ui/console for Node.js compatibility.
 *
 * The published package exposes a TypeScript entry point (plugin.ts).
 * Node.js cannot execute .ts files natively, so we transpile it to
 * JavaScript and update the package exports before deployment.
 *
 * pnpm stores packages behind symlinks which can cause Vercel's serverless
 * packager to fail ("files in symlinked directories").  When a symlink is
 * detected we replace it with a real copy of the directory contents.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const consolePkgDir = path.resolve(__dirname, '..', 'node_modules', '@object-ui', 'console');

// ── Step 0: Dereference pnpm symlink ────────────────────────────────────────
// pnpm links node_modules/@object-ui/console → .pnpm/…/node_modules/…
// Vercel rejects symlinked dirs in the deployment package, so replace the
// symlink with a real directory containing the actual files.
try {
  const stat = fs.lstatSync(consolePkgDir);
  if (stat.isSymbolicLink()) {
    const realDir = fs.realpathSync(consolePkgDir);
    console.log('[patch-console-plugin] Replacing symlink with real copy ...');
    fs.unlinkSync(consolePkgDir);
    fs.cpSync(realDir, consolePkgDir, { recursive: true });
  }
} catch {
  // Not a symlink or doesn't exist yet – continue normally
}

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
  // Use tsc to transpile the single file (paths passed as array args, not shell string)
  execFileSync('npx', [
    'tsc', '--outDir', consolePkgDir,
    '--declaration', 'false',
    '--module', 'nodenext',
    '--moduleResolution', 'nodenext',
    '--target', 'es2022',
    '--esModuleInterop', 'true',
    '--skipLibCheck', 'true',
    pluginTs,
  ], { stdio: 'inherit' });
} catch (err) {
  console.warn('[patch-console-plugin] tsc failed:', err.message);
  console.warn('[patch-console-plugin] Falling back to TypeScript API transpilation ...');
  // Fallback: use TypeScript compiler API for reliable transpilation
  const ts = require('typescript');
  const source = fs.readFileSync(pluginTs, 'utf-8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      declaration: false,
    },
    fileName: 'plugin.ts',
  });
  fs.writeFileSync(pluginJs, result.outputText, 'utf-8');
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
