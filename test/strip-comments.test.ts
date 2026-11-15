// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { stripComments } from '../scripts/lib/strip-comments.mjs';

/**
 * Pins `scripts/lib/strip-comments.mjs` against the hazard classes its header
 * names. These cases lived in `test/source-token-ratchet.test.ts`, measured
 * through the gate, until #2468 retired the gate; the stripper stayed because
 * `test/docs-object-term-consistency.test.ts` decides what it scans with it.
 */
describe('stripComments', () => {
  it('removes line, trailing and block comments, keeping the block\'s newlines', () => {
    const source = [
      '// a leading comment',
      'export const a = 1; // a trailing comment',
      '/**',
      ' * a block comment',
      ' */',
      'export const b = 2;',
    ].join('\n');

    expect(stripComments(source)).toBe(
      ['', 'export const a = 1; ', '', '', '', 'export const b = 2;'].join('\n'),
    );
  });

  it('keeps a comment opener that lives inside a string — the case a line matcher gets wrong', () => {
    // Not hypothetical: src/*/actions/*.ts ship QuickJS action bodies as template
    // literals, and those bodies carry their own `//` commentary.
    const source = 'export const BODY = `// not a comment\n  * nor this\n  /* nor this */`;';
    expect(stripComments(source)).toBe(source);
    expect(stripComments(`const s = '// kept'; // dropped`)).toBe(`const s = '// kept'; `);
    expect(stripComments(`const s = "a \\" // kept";`)).toBe(`const s = "a \\" // kept";`);
  });

  it('keeps a regex literal that contains quote and comment characters', () => {
    const line = String.raw`export const re = /['"]\/\/[/*]/g;`;
    expect(stripComments(`${line} // stripped`)).toBe(`${line} `);
  });

  it('reads `/` after an expression as division, not as a regex opener', () => {
    expect(stripComments('const x = (a) / b; // half')).toBe('const x = (a) / b; ');
    expect(stripComments('const y = n / 2 / 3;')).toBe('const y = n / 2 / 3;');
  });

  it('drops an unterminated block comment to the end of the file, newlines kept', () => {
    expect(stripComments('const a = 1;\n/* never closed\nstill comment')).toBe('const a = 1;\n\n');
  });
});
