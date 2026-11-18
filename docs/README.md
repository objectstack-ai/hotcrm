# HotCRM Docs

> **Maintained per change, not on a review cadence.** A pull request that adds, moves,
> retires or renames a document under `docs/` updates the tables below in the same PR;
> that is the whole mechanism, and no periodic review stands behind it. For when any page
> here last changed, read its `git log` — the one freshness record that cannot go stale.
> *Supersedes the "Last reviewed: June 4, 2026" stamp that stood here: a review date
> nothing produced and nothing checked, written once when this tree was reorganised and
> left untouched by every commit that maintained the file after it — #1570.*
> Scope: internal engineering, release, and operational documentation for this repository.

HotCRM also has product-facing documentation under [`content/docs/`](../content/docs/). Use that tree for user, admin, and marketplace docs. Use this `docs/` tree for implementation notes, current technical status, deployment, release, and developer reference.

## Start Here

| Need | Document |
| --- | --- |
| Current facts and verification commands | [STATUS.md](STATUS.md) |
| Complete feature inventory (numbered, per capability domain) | [feature-inventory.md](feature-inventory.md) |
| Runtime and metadata architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Local, artifact, and marketplace deployment | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Versioning and distribution | [RELEASE_STRATEGY.md](RELEASE_STRATEGY.md) |
| Module boundaries and the ADR-0130 multi-package split plan | [architecture/module-split-plan.md](architecture/module-split-plan.md) |
| The PSA (project delivery and cost) module — standard-product design and the first ADR-0130 module cut | [architecture/psa-module-plan.md](architecture/psa-module-plan.md) |
| The order-to-cash module — what sales sees after the contract: collection plan, invoice and payment status (REQ-0007) | [architecture/order-to-cash-module-plan.md](architecture/order-to-cash-module-plan.md) |
| Upgrade, seeding, and version alignment | [MAINTENANCE.md](MAINTENANCE.md) |
| Customer requirements and product disposition | [requirements/README.md](requirements/README.md) |
| Where object and field metadata is declared | [developers/api_reference.md](developers/api_reference.md) |
| ObjectStack code examples | [developers/code_examples.md](developers/code_examples.md) |
| How amounts, quantities, percentages and dates are shown, and which key carries each | [developers/number-formats.md](developers/number-formats.md) |

## Documentation Boundaries

| Location | Audience | Contents |
| --- | --- | --- |
| `content/docs/` | Product users, admins, customizers | Fumadocs content, localized docs, marketplace guides |
| `docs/` | Maintainers and contributors | Current architecture, status, deployment, release, developer reference |
| `docs/archive/` | Maintainers | Historical strategy reports, retired sprint plans, legacy package specs |
| `docs/architecture/` | Maintainers | Design proposals for shapes this repository does not have yet |

## Languages By Surface

Each surface a reader meets ships its own set of languages, and the sets differ: the docs site
has a Traditional Chinese edition the app does not, and the app speaks Spanish and Japanese
where nothing else does. This table is the record. `test/docs-language-matrix.test.ts` reads it
and holds the files to it both ways: every language listed for a surface exists there, and no
surface carries a language this table does not list. Adding or dropping a language on any
surface updates its row in the same PR.

| Surface | Languages | Where the files live | Guarded by |
| --- | --- | --- | --- |
| App UI | `en`, `zh-CN`, `es-ES`, `ja-JP` | One locale pack per language in every package, `src/*/translations/<locale>.ts`; the app declares the set in `i18n.supportedLocales` in `src/sales/index.ts` | `test/docs-language-matrix.test.ts`; every key in every pack: `test/i18n-references.test.ts` |
| Docs site | `en`, `zh-Hans`, `zh-Hant` | `content/docs/` and `content/blog/`: `<page>.mdx` with `<page>.zh-Hans.mdx` and `<page>.zh-Hant.mdx` beside it, and `meta.json` with `meta.zh-Hans.json` and `meta.zh-Hant.json`; the site declares the set in `languages` in `apps/docs/lib/i18n.ts` | `test/docs-language-matrix.test.ts` |
| In-app manuals | `en`, `zh` | `src/docs/*.md` and each module's `src/*/docs/*.md`, with `<name>.zh.md` beside each page; the platform serves the `zh` page to a `zh-CN` reader (primary-subtag match) | `test/docs-language-matrix.test.ts`; `test/docs-books.test.ts` |
| README | `en`, `zh-CN` | `README.md` and `README.zh-CN.md` | `test/docs-language-matrix.test.ts`; `test/marketplace-listing.test.ts` |
| Marketplace listing | `en`, `zh-CN` | `objectstack.manifest.json`: `description`, `tagline` and `readmePath` are the English listing, `translations.zh-CN` the Chinese one | `test/docs-language-matrix.test.ts`; `test/marketplace-listing.test.ts` |

Why a Traditional Chinese docs page labels UI nouns in English: the app ships no Traditional
pack, so the console shows Simplified — `AGENTS.md`, Documentation discipline rule 6.

## Current Repository Shape

HotCRM is a single ObjectStack marketplace app, shipped as one release artifact that carries four packages (ADR-0130 D4): `app.objectstack.hotcrm`, the `type: app` package, and the modules `app.objectstack.hotcrm.service`, `app.objectstack.hotcrm.revenue` and `app.objectstack.hotcrm.marketing`. The source of truth is [`objectstack.config.ts`](../objectstack.config.ts), which composes the four package stacks [`objectstack.composition.ts`](../objectstack.composition.ts) builds from `src/`.

```text
hotcrm/
├── objectstack.config.ts
├── objectstack.composition.ts
├── src/
│   ├── sales/          # the `type: app` package (ADR-0130) — a directory under src/ IS a package
│   ├── service/        # the service module — case, knowledge_article, article_feedback
│   ├── revenue/        # the revenue module — product, opportunity_line_item, quote, quote_line_item
│   ├── marketing/      # the marketing module — campaign, campaign_member
│   └── docs/           # package docs (ADR-0046), read from this fixed path by the builder
├── content/docs/       # Product documentation site content
└── docs/               # Internal documentation
```

Older documents may mention a retired multi-package direction. Those files now live in `docs/archive/`.

## Maintain The Docs

When changing metadata or runtime behavior:

1. Update the closest product docs in `content/docs/` if the user-facing behavior changed.
2. Update `docs/STATUS.md` when counts or verification commands change.
3. Leave `docs/developers/api_reference.md` alone when object fields change — the `fields:`
   block of `src/*/objects/*.object.ts` is the reference, and that page points at it rather
   than restating it. *Supersedes the instruction to hand-update that page, which asked for
   the field transcript since removed from it — 2026-08-31 ruling, item 5.*
4. Update `docs/developers/code_examples.md` when ObjectStack conventions change.
5. Run the checks listed in `docs/STATUS.md`.

## Archive Policy

Keep historical analysis, old sprint plans, and retired architecture proposals under `docs/archive/`. Do not link archived material from this index unless the reader explicitly needs historical context.
