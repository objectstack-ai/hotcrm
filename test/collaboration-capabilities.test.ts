// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { objectFiles } from './helpers/src-roster';
import stack from './helpers/composed-stack';

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
 * The authorization half is split. WHICH attachments a person reaches is the
 * platform's: attaching requires `canEdit(parent)`, reads are intersected with
 * the parents the caller can see, and deletes require uploader-or-parent-editor
 * (service-storage attachment hooks + ADR-0104 governed download). Whether a
 * person may open the panel AT ALL is this app's: `sys_attachment` is granted by
 * nothing but a permission set, and through #2029 none here granted it, so every
 * persona but the platform admin was refused the panel — see the canonical note
 * in `src/sales/objects/index.ts`. What this file pins is the app-side half: the
 * flag is only on where a real persona can actually use it, every such persona
 * holds the read grant (and, until a platform gate is fixed, only that), and the
 * guest set reaches none of it.
 * `test/record-attachments-access.test.ts` measures the two halves together.
 */

type AnyRec = Record<string, any>;


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

  it('every set that can read a files-enabled object can list its attachments, and none may write them yet', () => {
    // `sys_attachment` is granted by no platform baseline, so a set that reads
    // a files-enabled record but does not name the object hands its holders a
    // panel that answers 403 PERMISSION_DENIED (#2029). Which rows the read
    // reaches is the platform's parent-derived filter, not this grant.
    //
    // The write bits stay off. On 17.7.0 the platform's attach / delete gate
    // asks `canEdit(parent)`, which answers true for every controlled_by_parent
    // parent (crm_contact, crm_quote, crm_contract), so a write grant would let
    // a rep attach to a quote they cannot read and delete files from a contract
    // they cannot edit (measured, #2029; reported upstream). When the platform
    // fix is in the pinned version, the write bits are granted and this flips.
    const canRead = (ps: AnyRec, name: string) => {
      const perm = (ps.objects ?? {})[name];
      return perm?.allowRead === true || perm?.viewAllRecords === true;
    };
    const wrong = permissionSets
      .filter((ps) => ps.name !== 'guest_portal')
      .filter((ps) => FILES_ENABLED.some((name) => canRead(ps, name)))
      .map((ps) => ({ name: ps.name as string, perm: (ps.objects ?? {}).sys_attachment ?? {} }))
      .filter(({ perm }) =>
        perm.allowRead !== true ||
        perm.allowCreate === true || perm.allowEdit === true || perm.allowDelete === true ||
        perm.viewAllRecords === true || perm.modifyAllRecords === true)
      .map(({ name }) => name);
    expect(
      wrong,
      'sets whose sys_attachment grant is not exactly read — every set that opens a files-enabled ' +
        'record lists its attachments, and none writes them until the platform gate is fixed ' +
        `(canonical note in src/sales/objects/index.ts):\n  ${wrong.join('\n  ')}`,
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
    expect(
      (guest!.objects ?? {}).sys_attachment,
      'guest_portal names sys_attachment — an anonymous form submitter has no Attachments panel to open',
    ).toBeUndefined();
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
    const schemaFiles = objectFiles();
    // Vacuity guard, and here a COUNT really is the content proof: the class
    // this rule discriminates is *any* `.object.ts`, so every member of the
    // surface is a file that could restate the default. `readdirSync` does not
    // recurse and throws on a missing dir, but a schema tree relocated under
    // `src/<pkg>/objects/<sub>/` would leave this reading an existing directory of
    // hooks and shared modules and reporting clean over zero schemas.
    expect(
      schemaFiles.length,
      'no *.object.ts under any package objects/ — this sweep has gone vacuous; re-derive the ' +
        'surface against wherever the schemas went, do not delete the rule',
    ).toBeGreaterThan(10);

    const offenders: string[] = [];
    for (const file of schemaFiles) {
      const source = readFileSync(join(REPO_ROOT, file), 'utf8');
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
