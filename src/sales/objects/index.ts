// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Object Definitions Barrel
 * 
 * Re-exports this package's *.object.ts definitions for registration by the
 * app package's stack (`objectstack.composition.ts` → `src/sales/index.ts`). The `*.hook.ts` files sit beside them and are
 * registered through `./hooks.ts` instead — a hook is attached to the object
 * it names, and since the ADR-0130 layout a directory is a package, so the two
 * travel together.
 */

/*
 * Canonical note — the collaboration capabilities (`enable.files`,
 * `enable.feeds`). Referenced from each object that opts in (#602).
 *
 * **`enable.files` — attachments. Opt-in, spec default `false`.** It is a real,
 * doubly-enforced switch, not documentation:
 *
 * - Server: `plugin-audit`'s `enforceFilesCapability` runs `beforeInsert` on
 *   `sys_attachment` and throws `FILES_DISABLED` (403) when the row's
 *   `parent_object` does not declare `files: true`. No flag → no attachment can
 *   exist against the record, whatever the UI offers.
 * - Client: the console's `RecordDetailView` gates its Attachments panel on
 *   `enable?.files === true`, so an object without the flag has no upload
 *   surface at all.
 *
 * The flag opens the surface; it grants **no** access of its own, and nothing
 * else on the platform does either. `sys_attachment` is an object like any
 * other: the platform's member baseline names it nowhere (it was narrowed to
 * explicit-allow, objectstack-ai/objectstack#5491), so a person whose
 * permission sets do not grant it is refused the whole panel with 403
 * `PERMISSION_DENIED`, reads included. Measured on a fresh `pnpm dev` box
 * (#2029): `na.rep`, opening a quote they can read, got "You don't have access
 * to these attachments", and every other demo persona got the same answer.
 * The platform's attachments-access page names the remedy: an ordinary,
 * position-distributed permission set grants `sys_attachment`. So EVERY
 * permission set whose holders can read a files-enabled object grants it
 * `allowRead`, and `guest_portal` grants nothing.
 *
 * WHICH attachments that grant reaches stays with the parent record: a
 * `service-storage` middleware intersects every `sys_attachment` read with the
 * parents the caller can actually see (failing closed to a deny-all filter on
 * error). So a rep lists the attachments of the quotes they can read and of no
 * other (`test/record-attachments-access.test.ts` measures it).
 *
 * **Upload and delete follow the parent's update (#2038).** Every set that
 * grants `allowRead`, the default `crm_user` aside, grants `allowCreate` and
 * `allowDelete` beside it; `allowEdit` stays off, as the panel offers no
 * edit. WHERE those bits
 * take is the platform's: `service-storage` admits an upload only where a
 * by-id update of the parent record would be admitted, and a delete only from
 * the file's uploader or a person whose update of the parent would be
 * (objectstack-ai/objectstack#24549, shipped in 18.1.0). So a rep uploads to
 * the quotes of the accounts they can edit and deletes their own files, and
 * is refused (403 `ATTACHMENT_PARENT_ACCESS`) an upload to a contract they
 * only read or to a record they cannot reach.
 * `test/record-attachments-access.test.ts` measures both sides. `crm_user`,
 * which every member holds, keeps the read alone (its profile says why).
 *
 * Until 18.1.0 the write bits were held back on purpose, because the parent
 * gate did not yet give that answer: on 17.7.0 it admitted every
 * `controlled_by_parent` parent (objectstack-ai/objectstack#22455), and a
 * further leg stayed open until objectstack-ai/objectstack#24549. Granting
 * them earlier would have routed around a platform defect (AGENTS.md §2).
 *
 * Leads are deliberately excluded — attachments on unqualified leads invite
 * junk. Revisit on demand.
 *
 * **`enable.feeds` — record comments (`sys_comment`). Opt-OUT, spec default
 * `true`.** Both enforcement points gate on an explicit `false`
 * (`enforceFeedsCapability` throws `FEEDS_DISABLED` only for `feeds === false`;
 * the console renders the feed unless `enable?.feeds === false`), so every
 * HotCRM object already has comments enabled and authoring `feeds: true` would
 * restate a default rather than change behaviour. Do not add it: an inert
 * restatement is the kind of metadata that later reads as load-bearing.
 * If comments ever need to be switched off for an object, author `false`.
 * `test/collaboration-capabilities.test.ts` pins both halves of this rule.
 *
 * Verified in a live console (#602): the Discussion panel renders on the
 * opportunity and account records, a posted comment round-trips
 * (`POST /api/v1/data/sys_comment` → 201) and survives a reload.
 *
 * Like `enable.files`, the flag opens the surface and grants no access. The
 * Discussion panel reads two platform objects, `sys_comment` (the comments)
 * and `sys_activity` (the record's activity timeline), and the member baseline
 * names neither, so through #2029 every persona but the platform admin got
 * "You don't have permission to view comments on this record" and the same for
 * its activity (403 `PERMISSION_DENIED`). So every set that grants
 * `sys_attachment` also grants `sys_comment` read, create and edit and
 * `sys_activity` read, and `guest_portal` grants neither.
 *
 * WHICH threads those grants reach is the platform's, and it follows the
 * parent record (the platform's objectstack-ai/objectstack#4630 gates): a
 * `plugin-audit` middleware narrows every `sys_comment` and `sys_activity` read
 * to rows whose parent the caller can read, a post to a thread whose record the
 * caller cannot read is refused with 403 `RECORD_NOT_ACCESSIBLE`, and only a
 * comment's author may edit it. Measured as `na.rep` on a fresh `pnpm dev` box
 * (#2029): the comments and activity of the accounts, quotes and contracts they
 * can read are listed, those of records they cannot read are not (404 by id),
 * and a post to one of those is refused. `test/record-comments-access.test.ts`
 * pins it.
 *
 * **Deleting a comment follows the parent's update too (#2038).** The same
 * sets grant `sys_comment` `allowDelete`, and `plugin-audit` takes a
 * delete only from the comment's author or a person whose by-id update of the
 * parent would be admitted (objectstack-ai/objectstack#24549, shipped in
 * 18.1.0; held back until then for the same reason as the attachment bits).
 * So a rep removes a comment on a quote they can edit, and is refused on a
 * contract they only read; `test/record-comments-access.test.ts` measures it.
 * `crm_user` grants no delete: the `everyone` anchor refuses delete on any
 * object.
 */

export { Account } from './account.object';
export { Contact } from './contact.object';
export { Contract } from './contract.object';
export { Event } from './event.object';
export { EventAttendee } from './event_attendee.object';
export { Forecast } from './forecast.object';
export { Lead } from './lead.object';
export { Opportunity } from './opportunity.object';
export { Task } from './task.object';
