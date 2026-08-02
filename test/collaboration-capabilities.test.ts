// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * Collaboration-capability guards (#602) — `enable.files` and `enable.feeds`.
 *
 * Both flags are live in @objectstack 17 and enforced on BOTH sides, which is
 * what makes them worth pinning here rather than trusting a comment:
 *
 * - `files` (opt-in, spec default `false`): `plugin-audit`'s
 *   `enforceFilesCapability` rejects a `sys_attachment` insert whose
 *   `parent_object` does not declare `files: true` with 403 `FILES_DISABLED`,
 *   and the console renders the record Attachments panel only when the flag is
 *   `true`. Verified in the browser against a live dev stack: attaching to
 *   `crm_lead` (flag absent) answers
 *   `FILES_DISABLED — File attachments are not enabled for object 'crm_lead'`.
 * - `feeds` (opt-OUT, spec default `true`): the same plugin rejects
 *   `sys_comment` inserts only for an explicit `feeds: false`, and the console
 *   hides the record feed only on explicit `false`.
 *
 * The asymmetry is the whole point of these tests. `files: true` is a real
 * change in behaviour; `feeds: true` is a restatement of the default that
 * changes nothing, so this app authors the first and refuses the second —
 * inert metadata reads as load-bearing to the next author (and to the next
 * model), which is exactly how a "capability" nobody enforces gets shipped.
 *
 * The authorization half is the platform's, not this app's: attaching requires
 * `canEdit(parent)`, reads are intersected with the parents the caller can see,
 * and deletes require uploader-or-parent-editor (service-storage attachment
 * hooks + ADR-0104 governed download). No permission set here grants
 * `sys_attachment`, and none needs to — see the canonical note in
 * `src/objects/index.ts`. What this file pins is the app-side half: the flag is
 * only on where a real persona can actually use it, and never where the guest
 * set could reach it.
 */

type AnyRec = Record<string, any>;

const OBJECT_DIR = join(REPO_ROOT, 'src/objects');

const objects: AnyRec[] = (stack as any).objects ?? [];
const permissionSets: AnyRec[] = (stack as any).permissions ?? [];

const objectByName = new Map(objects.map((o) => [o.name as string, o]));
const setByName = new Map(permissionSets.map((p) => [p.name as string, p]));

const businessObjects = objects
  .filter((o) => typeof o.name === 'string' && !o.name.startsWith('sys_'))
  .map((o) => o.name as string);

/**
 * The shipped answer, per object. Attachments are enabled where a customer
 * document genuinely belongs to the record; `crm_lead` is deliberately absent
 * (attachments on unqualified leads invite junk — revisit on demand), and so
 * are the catalog/derived objects, whose files would belong to a product or a
 * report, not to a row.
 */
const FILES_ENABLED = [
  'crm_account',
  'crm_case',
  'crm_contact',
  'crm_contract',
  'crm_opportunity',
  'crm_quote',
] as const;

const filesFlag = (name: string) => objectByName.get(name)?.enable?.files;
const feedsFlag = (name: string) => objectByName.get(name)?.enable?.feeds;

/** Sets that can edit `objectName` — i.e. whose holders may attach to it. */
const setsThatCanEdit = (objectName: string) =>
  permissionSets
    .filter((ps) => {
      const perm = (ps.objects ?? {})[objectName];
      return perm?.allowEdit === true || perm?.modifyAllRecords === true;
    })
    .map((ps) => ps.name as string);

describe('enable.files is authored exactly where attachments belong', () => {
  it('every collaboration object opts in', () => {
    const missing = FILES_ENABLED.filter((name) => filesFlag(name) !== true);
    expect(
      missing,
      'objects that should accept attachments but do not declare enable.files — ' +
        `the platform answers 403 FILES_DISABLED for these:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('no other business object silently gains an attachment surface', () => {
    const unexpected = businessObjects
      .filter((name) => !(FILES_ENABLED as readonly string[]).includes(name))
      .filter((name) => filesFlag(name) === true);
    expect(
      unexpected,
      'attachments enabled outside the reviewed set — decide it, do not drift into it:\n  ' +
        `${unexpected.join('\n  ')}`,
    ).toEqual([]);
  });

  it('leads stay excluded (deliberate, #602 scope note)', () => {
    // Not folded into the test above: this one is a business decision with a
    // stated reason, and it should fail loudly and by name if reversed.
    expect(filesFlag('crm_lead')).not.toBe(true);
  });

  it('a files-enabled object is editable by at least one non-guest profile', () => {
    // Attaching requires `canEdit(parent)`. A flag on an object nobody can edit
    // renders an Upload button that answers 403 ATTACHMENT_PARENT_ACCESS for
    // every user — a surface that exists only to fail.
    const stranded = FILES_ENABLED.filter(
      (name) => setsThatCanEdit(name).filter((s) => s !== 'guest_portal').length === 0,
    );
    expect(
      stranded,
      `attachment surfaces no profile can use:\n  ${stranded.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the guest set can edit none of them, so it can attach to none', () => {
    // ADR-0090 D9 / the guest set's iron-clad rule. The platform gates the
    // attach on `canEdit(parent)`, so "guest gains nothing from enable.files"
    // is exactly "guest holds no edit on a files-enabled object".
    const guest = setByName.get('guest_portal');
    expect(guest, 'the guest_portal permission set is missing').toBeTruthy();
    const reachable = FILES_ENABLED.filter((name) => {
      const perm = (guest!.objects ?? {})[name];
      return perm?.allowEdit === true || perm?.modifyAllRecords === true || perm?.allowRead === true;
    });
    expect(
      reachable,
      `guest_portal touches a files-enabled object:\n  ${reachable.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('enable.feeds is left at its default', () => {
  it('record comments are enabled everywhere (nothing opts out)', () => {
    // The resolved value, read off the parsed stack: `feeds` defaults to `true`,
    // so this is what every HotCRM record actually offers today. Browser-verified
    // on `crm_opportunity` (#602): the Discussion panel renders, a posted comment
    // round-trips through `POST /api/v1/data/sys_comment` → 201 and survives a
    // reload.
    const disabled = businessObjects.filter((name) => feedsFlag(name) === false);
    expect(
      disabled,
      'objects with comments switched off — deliberate? then say why here:\n  ' +
        `${disabled.join('\n  ')}`,
    ).toEqual([]);
  });

  it('no *.object.ts restates `feeds: true` in source', () => {
    // Read the SOURCE, not the parsed stack: after `ObjectSchema.create()` the
    // default is materialised, so `enable.feeds === true` is true for every
    // object whether or not anyone authored it. Only the authored text can tell
    // an inert restatement from the default, which is the thing worth banning —
    // a key that changes nothing reads as a decision to the next author.
    const offenders: string[] = [];
    for (const file of readdirSync(OBJECT_DIR).filter((f) => f.endsWith('.object.ts'))) {
      const source = readFileSync(join(OBJECT_DIR, file), 'utf8');
      // Strip line comments so the prose explaining this rule cannot trip it.
      const code = source.replace(/^\s*\/\/.*$/gm, '');
      if (/\bfeeds\s*:\s*true\b/.test(code)) offenders.push(file);
    }
    expect(
      offenders,
      'inert `feeds: true` — the spec default is already true, so this line ' +
        `changes nothing. Author \`feeds: false\` to switch comments OFF, or nothing at all:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
