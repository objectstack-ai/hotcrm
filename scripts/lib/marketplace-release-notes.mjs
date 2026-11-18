// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The release notes `scripts/publish-marketplace.mjs` sends with a version
 * (`POST /api/v1/cloud/packages/:id/versions` → `release_notes`), read from
 * `CHANGELOG.md`, and the check they pass before any HTTP call (#2501).
 *
 * ## What was wrong
 *
 * The notes were exactly one `## VERSION` section. 6.4.0 is the first version
 * published since 6.2.0 — 6.3.0 and 6.2.1 were released but never reached the
 * marketplace — and its section says so ("First published release since
 * 6.2.0: the 6.3.0 and 6.2.1 entries below also apply to a 6.2.0 install"),
 * yet the listing carried 6.4.0's section alone. A 6.2.0 installer reading it
 * never learned about Order to Cash or the automatic position-holder move.
 *
 * ## Where "last published" comes from
 *
 * From the section itself, because that is the reviewed text the release PR
 * already writes: when the first non-blank line of the version's section is
 *
 *     First published release since X.Y.Z: …
 *
 * the notes span every section from this version down to, not including,
 * `## X.Y.Z`. Without that line the notes are this version's section alone,
 * as before. A live marketplace read was rejected: the publish would then
 * depend on which environment answered, a dry run could not show what a real
 * run sends, and nothing in review would say what the listing will carry.
 *
 * The line is parsed strictly and a near miss stops the publish, DRY_RUN
 * included: a section that mentions a "published release since" but not in
 * that form, or names a version with no `## X.Y.Z` heading below this one, is
 * refused rather than published as one section.
 *
 * ## What a customer reads
 *
 * A changeset is written for two readers: the fleet's PR gates, which need
 * `Clause-②:`, `Metadata-protocol:` and `Skills-docs:` lines at the top of its
 * body, and the person deciding whether to update. `changeset version` copies
 * both into `CHANGELOG.md`, prefixed with the commit (`- cdba71a: Clause-②: no`),
 * and the marketplace renders what it is sent (#2461). So each section body is
 * passed through `customerText()` before anything else, which removes:
 *
 * - the gate lines (`Clause-②:` / `Metadata-protocol:` / `Skills-docs:` at the
 *   start of a line), the changeset's own business, never the reader's;
 * - the commit prefix of an entry (`- cdba71a: ` or `- 2b664f6, 35df8e9: `);
 * - every parenthetical that carries a card or framework reference, whole:
 *   `(#2465)`, `(objectstack#33250)`, `(REQ-0007, #2315)`, `(#2316, phase 0)`.
 *   A parenthetical can leave a sentence without breaking it, and what sits
 *   beside a reference in one (a phase, an item, a ruling) is about the card;
 * - a framework reference left in running prose (`wait on objectstack#34336`)
 *   becomes "a platform change", which reads in each sentence it appears in.
 *
 * A HotCRM card number in running prose (`arrive with #2416`) has no wording
 * that is true in every sentence, so it is kept and named in the publish log
 * (`residualRefs`), for the release PR to reword. The user-facing prose, the
 * `## VERSION` / `### …` structure and the span are untouched.
 *
 * ## Size
 *
 * The cap applies to the filtered text. The whole text stays within `RELEASE_NOTES_CAP` characters. Each section
 * contributes what it always did — its `### Major Changes` when it has them
 * (3.0.0's whole section is 649 KB, 292 changesets deep, and what an installer
 * needs is what changes their deployment), otherwise the section — and when the span is longer than the cap, entries
 * (the `- ` items changesets write) are dropped from the end, whole: never cut
 * mid-entry. The text then ends in a notice that says it is truncated, points
 * to `CHANGELOG.md`, and names each omitted entry by its bold headline when
 * that list fits, or counts them per version when it does not.
 *
 * ⛔ Keep this module free of top-level side effects: the suite imports it.
 */

export class ReleaseNotesError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReleaseNotesError';
  }
}

/** The most characters `release_notes` carries. */
export const RELEASE_NOTES_CAP = 8000;

/** `First published release since X.Y.Z:` — the whole of the accepted form. */
const SINCE_LINE = /^First published release since (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?):(?:\s|$)/;
/** Anything that reads as an attempt at that line, so a near miss is refused. */
const SINCE_MENTION = /published (?:release|version)s? since/i;

/**
 * Every `## VERSION` section of a changelog, in document order.
 *
 * Headings are located with ONE static pattern and versions compared as
 * strings: building `new RegExp(version)` would need the version escaped, and
 * hand-escaping only `.` is the incomplete-sanitization shape CodeQL rejects
 * (js/incomplete-sanitization).
 */
function sectionsOf(md) {
  const headings = [...md.matchAll(/^## ([^\s]+)[^\S\n]*$/gm)];
  return headings.map((h, i) => ({
    version: h[1],
    text: md.slice(h.index, i + 1 < headings.length ? headings[i + 1].index : md.length),
  }));
}

/** A section's text without its `## VERSION` heading line. */
function withoutHeading(section) {
  return section.text.replace(/^## .*$/m, '');
}

/**
 * The version a section declares as the last published one, or undefined.
 * Throws on a near miss.
 */
function declaredLastPublished(section) {
  const intro = withoutHeading(section).split(/^### /m)[0];
  const firstLine = intro.split('\n').find((line) => line.trim() !== '') ?? '';
  const match = firstLine.match(SINCE_LINE);
  if (match) return match[1];
  if (SINCE_MENTION.test(intro)) {
    throw new ReleaseNotesError(
      `CHANGELOG.md ## ${section.version} mentions a "published release since" but not as its first line in the form ` +
        '"First published release since X.Y.Z: …", so the versions the notes must span cannot be read',
    );
  }
  return undefined;
}

/** A gate line the fleet's PR and changeset contract writes into a changeset body. */
const GATE_LINE = /^(?:Clause-②|Metadata-protocol|Skills-docs):/;
/** The commit prefix `changeset version` writes before an entry: one hash or several. */
const COMMIT_PREFIX = /^- [0-9a-f]{7,40}(?:, [0-9a-f]{7,40})*: /;
/**
 * A card or framework reference: `#2465`, `objectstack#33250`, `hotcrm#2463`,
 * `objectstack-ai/objectstack#30184`. Not `&#123;`, not `abc#1` inside a word.
 */
const REF = String.raw`(?<![\w&#/])(?:[\w.-]+\/)?(?:[A-Za-z][\w.-]*)?#\d+\b`;
const REF_PARENTHETICAL = new RegExp(String.raw`[^\S\n]*\([^()\n]*${REF}[^()\n]*\)`, 'g');
/** A reference to another repository (the platform's), as `owner/repo#N` or `repo#N`. */
const FOREIGN_REF = /(?<![\w&#/])(?:[\w.-]+\/)?([A-Za-z][\w.-]*)#\d+\b/g;

/**
 * A section body as a customer reads it: no gate lines, no commit prefixes,
 * no card or framework references (see "What a customer reads" above).
 * Exported for the suite.
 */
export function customerText(body) {
  const out = [];
  // `true` once an entry's `- ` line turned out to be a gate line: the marker
  // moves to the entry's first line of prose.
  let markerPending = false;
  for (const raw of body.split('\n')) {
    let line = raw.replace(COMMIT_PREFIX, '- ');
    const content = line.replace(/^\s*(?:- )?/, '');
    if (GATE_LINE.test(content)) {
      if (/^- /.test(line)) markerPending = true;
      continue;
    }
    if (markerPending) {
      if (content.trim() === '') continue;
      if (/^- /.test(line)) markerPending = false; // the next entry opened: this one was gate lines only
      else {
        line = `- ${line.replace(/^ {0,2}/, '')}`;
        markerPending = false;
      }
    }
    out.push(line);
  }
  return out
    .join('\n')
    .replace(REF_PARENTHETICAL, '')
    .replace(FOREIGN_REF, (ref, repo) => (repo.toLowerCase() === 'hotcrm' ? ref : 'a platform change'))
    .trim();
}

/** The references `customerText()` keeps (a HotCRM card number in running prose). */
function residualRefsOf(text) {
  return [...new Set(text.match(new RegExp(REF, 'g')) ?? [])];
}

/** What one section contributes: its `### Major Changes` if any, else all of it, as a customer reads it. */
function bodyOf(section) {
  // `$(?![\s\S])` is the end of the input under the `m` flag. (`\Z` is not a
  // JavaScript assertion: it matched a literal `Z`, so a Major Changes entry
  // containing a capital Z was cut there.)
  const major = section.text.match(/^### Major Changes\s*$([\s\S]*?)(?=^### |$(?![\s\S]))/m);
  return customerText(major ? major[1] : withoutHeading(section));
}

/**
 * A body split into blocks at each line that opens an entry (`- `) or a
 * `### ` heading. Every block keeps its original bytes; the first block is
 * the text before any of them (an intro paragraph, possibly empty).
 */
function blocksOf(body) {
  const starts = [0];
  for (const m of body.matchAll(/^(?:- |### )/gm)) if (m.index > 0) starts.push(m.index);
  return starts.map((start, i) => {
    const text = body.slice(start, i + 1 < starts.length ? starts[i + 1] : body.length);
    const kind = /^- /.test(text) ? 'entry' : /^### /.test(text) ? 'heading' : 'intro';
    return { kind, text };
  });
}

/** An entry's bold headline, or its first line when it has none (its commit prefix is gone by now). */
function headlineOf(entryText) {
  const bold = entryText.match(/\*\*([^*\n][\s\S]*?)\*\*/);
  if (bold) return `**${bold[1].replace(/\s+/g, ' ').trim()}**`;
  return entryText.slice(2).split('\n')[0].trim();
}

/** One section rendered from the blocks chosen for it. */
function renderSection(version, blocks, included) {
  const parts = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'intro') parts.push(b.text);
    else if (b.kind === 'entry' && included.has(b)) parts.push(b.text);
    else if (b.kind === 'heading') {
      // A heading stays only while at least one entry under it does.
      let keep = false;
      for (let j = i + 1; j < blocks.length && blocks[j].kind !== 'heading'; j++) {
        if (blocks[j].kind === 'entry' && included.has(blocks[j])) keep = true;
      }
      if (keep) parts.push(b.text);
    }
  }
  const body = parts.join('').trim();
  return body ? `## ${version}\n\n${body}` : `## ${version}`;
}

function truncationNotice(omitted, cap, { headlines }) {
  const lead = `…truncated to fit the listing's ${cap.toLocaleString('en-US')}-character limit.`;
  if (headlines) {
    const items = omitted.map((o) => `- ${o.version}: ${headlineOf(o.block.text)}`).join('\n');
    return `${lead} Not shown above; the full entries are in CHANGELOG.md in the repository:\n\n${items}`;
  }
  const perVersion = new Map();
  for (const o of omitted) perVersion.set(o.version, (perVersion.get(o.version) ?? 0) + 1);
  const counts = [...perVersion].map(([v, n]) => `${n} from ${v}`).join(', ');
  return `${lead} ${omitted.length} more ${omitted.length === 1 ? 'entry' : 'entries'} (${counts}) are in CHANGELOG.md in the repository.`;
}

/**
 * The release notes for `version`, read from a changelog's markdown.
 *
 * @param {string} md       the whole of `CHANGELOG.md`
 * @param {string} version  the version being published
 * @param {{ cap?: number }} [options]
 * @returns {{ text: string, span: string[], versions: string[], omitted: number, residualRefs: string[] } | undefined}
 *   undefined when the changelog has no section (or an empty one) for `version`;
 *   `span` are the sections the notes cover, `versions` the ones the text shows,
 *   `omitted` the entries dropped for size, `residualRefs` the card references
 *   the text still carries
 */
export function releaseNotesFromChangelog(md, version, options) {
  const notes = buildReleaseNotes(md, version, options);
  return notes && { ...notes, residualRefs: residualRefsOf(notes.text) };
}

function buildReleaseNotes(md, version, { cap = RELEASE_NOTES_CAP } = {}) {
  const sections = sectionsOf(md);
  const idx = sections.findIndex((s) => s.version === version);
  if (idx === -1) return undefined;

  let span = [sections[idx]];
  const since = declaredLastPublished(sections[idx]);
  if (since !== undefined) {
    const sinceIdx = sections.findIndex((s) => s.version === since);
    if (sinceIdx === -1 || sinceIdx <= idx) {
      throw new ReleaseNotesError(
        `CHANGELOG.md ## ${version} says it is the first published release since ${since}, ` +
          `but there is no ## ${since} section below it`,
      );
    }
    span = sections.slice(idx, sinceIdx);
  }

  const parts = span
    .map((s) => ({ version: s.version, body: bodyOf(s) }))
    .filter((p, i) => i === 0 || p.body !== '');
  if (!parts[0].body) return undefined;
  const versions = parts.map((p) => p.version);

  const whole = parts.map((p) => `## ${p.version}\n\n${p.body}`).join('\n\n');
  if (whole.length <= cap) return { text: whole, span: versions, versions, omitted: 0 };

  // Over the cap: keep the first k entries in document order, whole.
  const blocked = parts.map((p) => ({ version: p.version, blocks: blocksOf(p.body) }));
  const entries = blocked.flatMap((s) => s.blocks.filter((b) => b.kind === 'entry').map((block) => ({ version: s.version, block })));
  const render = (k, notice) => {
    const included = new Set(entries.slice(0, k).map((e) => e.block));
    const shown = blocked.filter((s, i) => i === 0 || s.blocks.some((b) => included.has(b)));
    const text = shown.map((s) => renderSection(s.version, s.blocks, included)).join('\n\n');
    const omitted = entries.slice(k);
    return {
      text: `${text}\n\n${truncationNotice(omitted, cap, notice)}`,
      span: versions,
      versions: shown.map((s) => s.version),
      omitted: omitted.length,
    };
  };
  // As many whole entries as fit first; the omitted ones named by headline when
  // that list fits beside them, counted otherwise.
  for (let k = entries.length - 1; k >= 0; k--) {
    for (const notice of [{ headlines: true }, { headlines: false }]) {
      const out = render(k, notice);
      if (out.text.length <= cap) return out;
    }
  }

  // Not even the intro fits: no entries to drop whole, so cut the text and say so.
  const marker = '\n\n…cut at the listing limit — the full entry is CHANGELOG.md in the repository.';
  const text = `## ${version}\n\n${parts[0].body}`.slice(0, cap - marker.length).trimEnd() + marker;
  return { text, span: versions, versions: [version], omitted: entries.length };
}

/** One line for the publish log: size, the sections carried, what was dropped. */
export function describeReleaseNotes(notes) {
  if (!notes) return 'release notes: (none)';
  const dropped = notes.omitted
    ? ` · truncated, ${notes.omitted} ${notes.omitted === 1 ? 'entry' : 'entries'} omitted, shows ${notes.versions.join(', ')}`
    : '';
  const refs = notes.residualRefs?.length
    ? ` · ${notes.residualRefs.length} card ${notes.residualRefs.length === 1 ? 'reference' : 'references'} left in prose, for the release PR to reword: ${notes.residualRefs.join(', ')}`
    : '';
  return `release notes: ${notes.text.length} chars · sections ${notes.span.join(', ')}${dropped}${refs}`;
}
