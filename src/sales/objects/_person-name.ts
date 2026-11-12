// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * How a person's two name fields become the one name every surface shows
 * (#2431): the contact's stored `full_name`, the lead's `full_name` and
 * stored `display_title`, and the person name the lead and contact
 * notifications print.
 *
 * ### The rule is keyed on the NAME, not on a locale
 *
 * A Chinese, Japanese or Korean name is written family name first, with no
 * space: 姓「张」名「伟」is 「张伟」. Joining `first_name last_name` with a
 * space, as every surface did, showed it as 「伟 张」. So when the family name
 * (`last_name`) starts with a CJK character — Han, kana or Hangul — the name
 * is family + given with no separator; otherwise it stays `first last`.
 *
 * Why the name and not the viewer's locale: the title is STORED once
 * (#2230 — import matching, sort and search read the stored column) and read
 * in every locale. A rule keyed on the writer's locale would store
 * "Smith John" when a zh-CN user enters an English contact, and a rule keyed
 * on the reader's locale cannot exist for a stored value. Measured on
 * @objectstack 18.3.0: the formula stdlib binds `now`, the time zone, the
 * permission predicate and option labels, and no locale at all; a hook sees
 * `ctx.session.locale`, the writer's, which is the wrong key for the reason
 * above.
 *
 * ### One expression, three consumers
 *
 * {@link personNameCel} is the single spelling. The two objects store it,
 * and the flows pass it to the notification templates as `person_name`.
 * The hook bodies cannot import it — a hook runs body-only in a QuickJS
 * sandbox with no module scope (AGENTS.md, Tech Stack rule 3) — so each one
 * writes the same character class as a regex literal, and
 * `test/person-name-order.test.ts` holds every copy equal to
 * {@link CJK_FAMILY_NAME_CLASS}.
 */

/**
 * The scripts whose names are written family name first, as one regex
 * character class: kana (U+3040–U+30FF), CJK Unified Ideographs Extension A
 * (U+3400–U+4DBF), CJK Unified Ideographs (U+4E00–U+9FFF), CJK Compatibility
 * Ideographs (U+F900–U+FAFF) and Hangul syllables (U+AC00–U+D7AF).
 *
 * Written with escapes here; the string itself holds the characters, so the
 * CEL expression built from it carries no backslash for a CEL string literal
 * to re-read.
 */
export const CJK_FAMILY_NAME_CLASS = '[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]';

/**
 * The CEL source of a person's display name, read off `<row>.first_name` and
 * `<row>.last_name` (`row` is `record` on an object, `leadRecord` in the
 * conversion flows).
 *
 * `has()` guards the family-name test: an update hands back a key the driver
 * did not store as absent, and strict CEL aborts on an absent key
 * (AGENTS.md, "Validation predicates must be TOTAL"). `joinNonEmpty` already
 * skips a missing or blank part.
 */
export const personNameCel = (row: string): string =>
  `(has(${row}.last_name) && matches(${row}.last_name, '^${CJK_FAMILY_NAME_CLASS}')` +
  ` ? joinNonEmpty([${row}.last_name, ${row}.first_name], '')` +
  ` : joinNonEmpty([${row}.first_name, ${row}.last_name], ' '))`;
