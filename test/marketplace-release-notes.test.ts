// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  RELEASE_NOTES_CAP,
  ReleaseNotesError,
  describeReleaseNotes,
  releaseNotesFromChangelog,
} from '../scripts/lib/marketplace-release-notes.mjs';

/**
 * The marketplace release notes span every version since the last published
 * one (#2501).
 *
 * 6.4.0's section opens "First published release since 6.2.0: the 6.3.0 and
 * 6.2.1 entries below also apply to a 6.2.0 install", and the listing carried
 * 6.4.0's section alone. These cases pin a single-version release (as before),
 * the span the declaration asks for (on the real CHANGELOG.md), the cap, and
 * the refusal of a declaration that cannot be read.
 */

const CHANGELOG = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

/** The real section for `version`, without its heading, trimmed. */
function sectionBody(md: string, version: string): string {
  const headings = [...md.matchAll(/^## ([^\s]+)[^\S\n]*$/gm)];
  const i = headings.findIndex((h) => h[1] === version);
  const end = i + 1 < headings.length ? headings[i + 1].index : md.length;
  return md.slice(headings[i].index!, end).replace(/^## .*$/m, '').trim();
}

/** The `- ` entries of a section body, each as written. */
function entriesOf(body: string): string[] {
  return body.split(/^(?=- |### )/m).filter((b) => b.startsWith('- ')).map((b) => b.trimEnd());
}

function refusal(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a refusal, but the call returned');
}

const entry = (id: string, headline: string, filler = 0) =>
  `- ${id}: **${headline}.** ${'Words of detail. '.repeat(filler)}`.trimEnd();

/** A changelog of sections, newest first: `[version, intro, entries[]]`. */
function changelog(...sections: Array<[string, string, string[]]>): string {
  const parts = sections.map(([v, intro, entries]) =>
    [`## ${v}`, intro, entries.length ? `### Patch Changes\n\n${entries.join('\n')}` : '']
      .filter(Boolean)
      .join('\n\n'),
  );
  return `# Changelog\n\n${parts.join('\n\n')}\n`;
}

describe('a single-version release', () => {
  it('sends the section as before when it declares no span (6.3.0, real CHANGELOG)', () => {
    const notes = releaseNotesFromChangelog(CHANGELOG, '6.3.0')!;
    expect(notes.text).toBe(`## 6.3.0\n\n${sectionBody(CHANGELOG, '6.3.0')}`);
    expect(notes.span).toEqual(['6.3.0']);
    expect(notes.omitted).toBe(0);
  });

  it('prefers the Major Changes, read to the end of the section even past a capital Z', () => {
    const md = '# Changelog\n\n## 2.0.0\n\n### Major Changes\n\n- abc1234: **Zones replace regions.** Zebra.\n\n## 1.0.0\n\n- x\n';
    expect(releaseNotesFromChangelog(md, '2.0.0')!.text).toBe(
      '## 2.0.0\n\n- abc1234: **Zones replace regions.** Zebra.',
    );
  });

  it('answers undefined for a version the changelog does not carry', () => {
    expect(releaseNotesFromChangelog(CHANGELOG, '0.0.1')).toBeUndefined();
  });
});

describe('the span since the last published version', () => {
  it('carries every section from 6.4.0 down to 6.2.0, within the cap (real CHANGELOG)', () => {
    const notes = releaseNotesFromChangelog(CHANGELOG, '6.4.0')!;
    expect(notes.span).toEqual(['6.4.0', '6.3.0', '6.2.1']);
    expect(notes.text.length).toBeLessThanOrEqual(RELEASE_NOTES_CAP);
    expect(notes.text.startsWith(`## 6.4.0\n\n${sectionBody(CHANGELOG, '6.4.0')}\n\n## 6.3.0\n\n`)).toBe(true);
    expect(notes.text).not.toContain('## 6.2.0');

    // Every entry of the three sections is either in the text whole, or named
    // by its headline in the truncation notice — none is cut or lost.
    const [shown, notice = ''] = notes.text.split('\n\n…truncated');
    let omitted = 0;
    for (const v of notes.span) {
      for (const e of entriesOf(sectionBody(CHANGELOG, v))) {
        if (shown.includes(e)) continue;
        omitted++;
        const headline = e.match(/\*\*([\s\S]*?)\*\*/)![1].replace(/\s+/g, ' ').trim();
        expect(notice, `${v}: ${headline}`).toContain(`- ${v}: **${headline}**`);
      }
    }
    expect(omitted).toBe(notes.omitted);
    if (omitted) expect(notice).toContain('CHANGELOG.md');
  });

  it('joins the whole sections when they fit, and stops above the named version', () => {
    const md = changelog(
      ['3.0.0', 'First published release since 1.0.0: the 2.0.0 entry below also applies.', [entry('c3', 'Three')]],
      ['2.0.0', '', [entry('b2', 'Two')]],
      ['1.0.0', '', [entry('a1', 'One')]],
    );
    const notes = releaseNotesFromChangelog(md, '3.0.0')!;
    expect(notes.text).toBe(
      '## 3.0.0\n\nFirst published release since 1.0.0: the 2.0.0 entry below also applies.\n\n' +
        '### Patch Changes\n\n- c3: **Three.**\n\n## 2.0.0\n\n### Patch Changes\n\n- b2: **Two.**',
    );
    expect(describeReleaseNotes(notes)).toBe(`release notes: ${notes.text.length} chars · sections 3.0.0, 2.0.0`);
  });

  it('refuses a declaration it cannot read, or one naming no section below', () => {
    const nearMiss = changelog(['3.0.0', 'First published version since 1.0.0.', [entry('c3', 'Three')]], ['1.0.0', '', []]);
    const notFirst = changelog(['3.0.0', 'Hello.\n\nFirst published release since 1.0.0: x.', []], ['1.0.0', '', []]);
    const missing = changelog(['3.0.0', 'First published release since 0.9.0: x.', [entry('c3', 'Three')]], ['1.0.0', '', []]);
    const above = changelog(['3.0.0', '', []], ['2.0.0', 'First published release since 3.0.0: x.', []]);
    for (const [md, v] of [[nearMiss, '3.0.0'], [notFirst, '3.0.0'], [missing, '3.0.0'], [above, '2.0.0']] as const) {
      expect(refusal(() => releaseNotesFromChangelog(md, v))).toBeInstanceOf(ReleaseNotesError);
    }
  });
});

describe('the cap', () => {
  const md = changelog(
    ['3.0.0', 'First published release since 1.0.0: x.', [entry('c1', 'Alpha', 20), entry('c2', 'Bravo', 20)]],
    ['2.0.0', '', [entry('b1', 'Charlie', 20), entry('b2', 'Delta', 20)]],
    ['1.0.0', '', []],
  );

  it('drops whole entries from the end and names each one in the notice', () => {
    const cap = 1000;
    const notes = releaseNotesFromChangelog(md, '3.0.0', { cap })!;
    expect(notes.text.length).toBeLessThanOrEqual(cap);
    expect(notes.omitted).toBeGreaterThan(0);
    const [shown, notice] = notes.text.split('\n\n…truncated');
    expect(notice).toContain('CHANGELOG.md');
    for (const [v, id, h] of [['3.0.0', 'c1', 'Alpha'], ['3.0.0', 'c2', 'Bravo'], ['2.0.0', 'b1', 'Charlie'], ['2.0.0', 'b2', 'Delta']]) {
      const whole = entry(id, h, 20);
      // Whole in the text, or absent from it and named in the notice; never part of it.
      if (shown.includes(`- ${id}:`)) expect(shown).toContain(whole);
      else expect(notice).toContain(`- ${v}: **${h}.**`);
    }
    expect(describeReleaseNotes(notes)).toContain(`truncated, ${notes.omitted}`);
  });

  it('counts the omitted entries per version when their headlines do not fit', () => {
    const notes = releaseNotesFromChangelog(md, '3.0.0', { cap: 600 })!;
    expect(notes.text.length).toBeLessThanOrEqual(600);
    expect(notes.text).toMatch(/\d+ more entr(y|ies) \(.*from 2\.0\.0\) are in CHANGELOG\.md/);
    expect(notes.text).toContain('- c1:');
    expect(notes.text).not.toContain('**Delta');
  });
});
