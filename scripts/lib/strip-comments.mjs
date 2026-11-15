// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `stripComments()` — remove the comments from a TypeScript source, and nothing else.
 *
 * Moved here from `scripts/check-source-token-ratchet.mjs` when that gate was
 * retired (#2468). Its one consumer is `test/docs-object-term-consistency.test.ts`,
 * which runs every `.ts` file through it to decide what the #802 Chinese-term
 * guard may see: a retired spelling may sit in a comment, but not in the code.
 * ⇒ EDITING THIS FUNCTION EDITS WHAT THAT GUARD SCANS. Strip more than intended
 * and offending literals stop being read — the guard then passes by finding
 * nothing, which reads exactly like clean. Change it with
 * `test/strip-comments.test.ts` and that suite in hand.
 *
 * ## The rule — a character scanner, not a line matcher
 *
 *   1. `//` to end of line, and `/* … *\/` however many lines it spans, are
 *      removed — including a trailing comment that follows code on its line.
 *      The newlines inside a removed block comment are kept, so line numbers
 *      still match the file.
 *   2. A comment opener inside a string literal (`'…'`, `"…"`, `` `…` ``) or
 *      inside a regular-expression literal is **not** a comment. String and
 *      regex bodies are preserved byte-for-byte, escapes included.
 *   3. `/` is read as a regex literal when the previous significant character
 *      cannot end an expression (`=`, `(`, `,`, `:`, `[`, `!`, `&`, `|`, `?`,
 *      `{`, `}`, `;`) and as division otherwise. This is the standard
 *      heuristic; it is ambiguous only after `)`, where this scanner chooses
 *      division.
 *
 * It is hand-written because TypeScript 7's npm package exposes no compiler
 * API to borrow a scanner from. Its correctness over the whole tree was proved
 * by hand with esbuild when it was written (#1183): for every first-party `.ts`
 * file, the minified output of the file and of `stripComments(file)` were
 * byte-identical (286 files, 0 divergent).
 */

/** True when `/` at this point opens a regex literal rather than dividing. */
function regexCanFollow(prev) {
  if (prev === '') return true;
  return !/[\w$)\]]/.test(prev);
}

export function stripComments(source) {
  let out = '';
  let prev = ''; // last significant (non-whitespace) character emitted
  let i = 0;

  const emit = (text) => {
    out += text;
    const trimmed = text.trimEnd();
    if (trimmed !== '') prev = trimmed[trimmed.length - 1];
  };

  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];

    if (c === '/' && d === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    if (c === '/' && d === '*') {
      const end = source.indexOf('*/', i + 2);
      const body = source.slice(i, end === -1 ? source.length : end + 2);
      out += body.replace(/[^\n]/g, ''); // keep the newlines, drop the prose
      i += body.length;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === c) {
          j++;
          break;
        }
        // An unterminated ' or " cannot cross a line; a template literal can.
        if (c !== '`' && source[j] === '\n') break;
        j++;
      }
      emit(source.slice(i, j));
      i = j;
      continue;
    }

    if (c === '/' && regexCanFollow(prev)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < source.length) {
        const ch = source[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '\n') break; // unterminated — not a regex after all
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) {
          j++;
          closed = true;
          break;
        }
        j++;
      }
      if (closed) {
        while (j < source.length && /[a-z]/.test(source[j])) j++; // flags
        emit(source.slice(i, j));
        i = j;
        continue;
      }
      // Not a regex literal after all — fall through and emit the bare slash.
    }

    emit(c);
    i++;
  }

  return out;
}
