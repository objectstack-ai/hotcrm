// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * Article Feedback Object (#601)
 *
 * One reader's verdict on one knowledge article — the WRITER behind
 * `crm_knowledge_article.helpful_count` / `not_helpful_count`, which were
 * `readonly` with nothing on either side of the platform able to move them.
 *
 * ### Why a row and not a counter bump
 *
 * The obvious shape — a "Helpful" button whose action body does
 * `helpful_count + 1` — cannot be built on this platform, and the reason is
 * measured rather than assumed:
 *
 *  - A `type: 'script'` action body runs in the QuickJS sandbox, whose
 *    execution context carries no caller identity. An UPDATE it issues against
 *    an object with sharing rules is refused by the sharing middleware even for
 *    the record's owner — the measurement `src/flows/case-actions.flow.ts`
 *    records, and the reason both case actions are screen flows. INSERTS are
 *    unaffected, which is the seam this object takes.
 *  - `crm_knowledge_article` is `public_read`: read-open, WRITE-OWNED. So the
 *    one agent who could bump the counter by hand is the article's author,
 *    which is precisely the person whose vote is worthless.
 *  - There is no atomic increment on the data API, so two concurrent votes
 *    read-modify-write the same value and one of them disappears.
 *
 * A vote row sidesteps all three: the reader INSERTS their own row (allowed),
 * and `article_feedback_metrics_refresh` (`article_feedback.hook.ts`) RECOUNTS
 * the article's two counters from this table under the hook's own privileges.
 * Recount, not increment — it is idempotent, it self-heals after a deleted or
 * edited vote, and it cannot drift the way a running total does. Exactly the
 * shape `campaign_member_metrics_refresh` uses to keep `crm_campaign`'s metric
 * block live (#597), which is the precedent this file follows on purpose
 * rather than inventing a second idiom for the same problem.
 *
 * ### What it buys beyond a writer
 *
 * A counter with no row behind it cannot answer "did this person already
 * vote", so it counts one enthusiast forty times. `unique_vote_per_reader`
 * below keys one row per (article, reader) and the `submit_article_feedback`
 * action UPDATES that row when a reader changes their mind — so the counters
 * mean "how many people", which is the only reading that makes
 * `helpful_count` vs `not_helpful_count` a comparison rather than two
 * unrelated tallies.
 *
 * ⚠️ `verdict` is deliberately two-valued. A five-star scale, a free-text
 * reason taxonomy and "was this article up to date" are all plausible and all
 * unbuilt: this object exists to give two declared counters a real writer, and
 * a vocabulary nothing reads would recreate the very defect it is fixing.
 */
export const ArticleFeedback = ObjectSchema.create({
  name: 'crm_article_feedback',
  label: 'Article Feedback',
  pluralLabel: 'Article Feedback',
  icon: 'thumbs-up',
  description: 'One reader’s helpful / not-helpful verdict on a knowledge article',

  // ADR-0090 D1/D7: OWD is an authored decision. Feedback is an attribute of
  // the article, so record access DERIVES from it (ADR-0055) — the same call
  // `crm_campaign_member` makes, and for the same reason: a vote row means
  // nothing apart from the article it is about, and `crm_knowledge_article` is
  // `public_read`, so anyone who can read the article can read its feedback.
  //
  // `private` would have been wrong in the way it was wrong on
  // `crm_campaign_member` before #488: with the voter as owner, the counters'
  // own evidence would be invisible to the author trying to understand them.
  sharingModel: 'controlled_by_parent',

  // ADR-0079: junction rows have no derivable text title; point the canonical
  // nameField at the stored autonumber explicitly (autonumber is not in the
  // auto-derivation whitelist). Same call as `crm_campaign_member` and
  // `crm_event_attendee`.
  nameField: 'feedback_number',

  // A related list takes its columns from the child's `highlightFields` MINUS
  // the lookup it is scoped by, and this object ships no view of its own — so
  // this list IS the feedback panel on an article's detail page (#944): the
  // verdict, and who gave it.
  //
  // TWO fields are deliberately absent, for two different reasons:
  //
  //  - `feedback_number`, the same call `crm_campaign_member` makes with
  //    `member_number`: it is the record TITLE, which a detail page hoists out
  //    of the body, so leading the strip with it would fill the panel with
  //    autonumbers instead of verdicts.
  //  - `comment`, a 500-character textarea. A highlight strip holds short
  //    values, and keeping it out is also what stops the `basic` group being
  //    ENTIRELY title-or-strip — a group whose every field is hoisted keeps its
  //    heading on forms and silently vanishes from detail pages
  //    (`field-group-shadowed`, the same trap `crm_campaign_member`'s `basic`
  //    group and `crm_task`'s `assignment` group each had to be rescued from).
  //    So the comment is the group's own content, one click into the row.
  highlightFields: ['crm_knowledge_article', 'verdict', 'owner_id'],

  fieldGroups: [
    { key: 'basic', label: 'Feedback', icon: 'message-square' },
  ],

  fields: {
    feedback_number: Field.autonumber({
      label: 'Feedback #',
      format: 'AF-{0000}',
      group: 'basic',
    }),

    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    // Here it is also the VOTER: the platform stamps it on insert, which is
    // what `unique_vote_per_reader` keys on and what lets a reader change
    // their own mind without an admin's help.
    owner_id: Field.lookup('sys_user', {
      label: 'Reader',
      group: 'basic',
      system: true,
      readonly: false,
    }),

    /**
     * The article this verdict is about.
     *
     * `deleteBehavior: 'cascade'` — a vote on a deleted article denotes
     * nothing. This is the lesson #696 cost the campaign junction: both party
     * lookups there took `Field.lookup`'s `set_null` default, the cleared row
     * instantly violated the object's own required-reference rule, and every
     * enrolled person became permanently undeletable. A required lookup that
     * defaults to `set_null` is that bug waiting to happen, so the behaviour is
     * spelled out here rather than inherited.
     */
    crm_knowledge_article: Field.lookup('crm_knowledge_article', {
      label: 'Article',
      required: true,
      storage: { notNull: true },
      group: 'basic',
      deleteBehavior: 'cascade',
      description: 'Knowledge article this feedback is about.',
    }),

    verdict: Field.select({
      label: 'Verdict',
      required: true,
      storage: { notNull: true },
      group: 'basic',
      options: [
        { label: 'Helpful', value: 'helpful', color: '#10B981', default: true },
        { label: 'Not Helpful', value: 'not_helpful', color: '#EF4444' },
      ],
    }),

    comment: Field.textarea({
      label: 'Comment',
      group: 'basic',
      maxLength: 500,
      description: 'Optional note explaining the verdict — read by the article’s author.',
    }),
  },

  indexes: [
    { fields: ['crm_knowledge_article'] },
    { fields: ['verdict'] },
    // One vote per reader per article. Without it the counters answer "how many
    // clicks", which is not a number anybody wants next to "Not Helpful".
    //
    // `unique: 'organization'` states the scope explicitly, per ADR-0120: the
    // driver prepends the NULL-safe organization key part
    // (`COALESCE(organization_id, '__global__')`) at registration, so the
    // constraint is one vote per reader per article WITHIN an organization,
    // and rows with no organization form one bucket rather than each escaping
    // under SQL's NULL-distinct semantics. Bare `unique: true` is the
    // deprecated positional spelling of `'global'` — it warns today
    // (`unique/unscoped-declared-index`) and protocol 18 rejects it, and
    // "globally unique across every installation" is not what one reader's
    // opinion of one article means.
    { fields: ['crm_knowledge_article', 'owner_id'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
