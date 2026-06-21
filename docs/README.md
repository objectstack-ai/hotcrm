# HotCRM Docs

> Last reviewed: June 4, 2026
> Scope: internal engineering, release, and operational documentation for this repository.

HotCRM also has product-facing documentation under [`content/docs/`](../content/docs/). Use that tree for user, admin, and marketplace docs. Use this `docs/` tree for implementation notes, current technical status, deployment, release, and developer reference.

## Start Here

| Need | Document |
| --- | --- |
| Current facts and verification commands | [STATUS.md](STATUS.md) |
| Runtime and metadata architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Local, artifact, and marketplace deployment | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Versioning and distribution | [RELEASE_STRATEGY.md](RELEASE_STRATEGY.md) |
| Upgrade, seeding, and version alignment | [MAINTENANCE.md](MAINTENANCE.md) |
| Customer requirements and product disposition | [requirements/README.md](requirements/README.md) |
| Object field reference | [developers/api_reference.md](developers/api_reference.md) |
| ObjectStack code examples | [developers/code_examples.md](developers/code_examples.md) |

## Documentation Boundaries

| Location | Audience | Contents |
| --- | --- | --- |
| `content/docs/` | Product users, admins, customizers | Fumadocs content, localized docs, marketplace guides |
| `docs/` | Maintainers and contributors | Current architecture, status, deployment, release, developer reference |
| `docs/archive/` | Maintainers | Historical strategy reports, retired sprint plans, legacy package specs |

## Current Repository Shape

HotCRM is a single ObjectStack marketplace app. The source of truth is [`objectstack.config.ts`](../objectstack.config.ts), which registers metadata from `src/`.

```text
hotcrm/
├── objectstack.config.ts
├── src/
│   ├── objects/        # ObjectSchema.create metadata, object lifecycle hooks
│   ├── actions/        # UI actions and AI-callable action bodies
│   ├── flows/          # ObjectStack automation flows
│   ├── agents/         # AI agent definitions
│   ├── skills/         # AI skills used by agents
│   ├── dashboards/     # Dashboard metadata
│   ├── reports/        # Report metadata
│   ├── views/, pages/  # App UI metadata
│   ├── profiles/       # Permission sets
│   ├── sharing/        # Sharing rules and role hierarchy
│   ├── translations/   # Locale bundles
│   └── data/           # Seed data
├── content/docs/       # Product documentation site content
└── docs/               # Internal documentation
```

Older documents may mention a retired multi-package direction. Those files now live in `docs/archive/`.

## Maintain The Docs

When changing metadata or runtime behavior:

1. Update the closest product docs in `content/docs/` if the user-facing behavior changed.
2. Update `docs/STATUS.md` when counts or verification commands change.
3. Update `docs/developers/api_reference.md` when object fields change.
4. Update `docs/developers/code_examples.md` when ObjectStack conventions change.
5. Run the checks listed in `docs/STATUS.md`.

## Archive Policy

Keep historical analysis, old sprint plans, and retired architecture proposals under `docs/archive/`. Do not link archived material from this index unless the reader explicitly needs historical context.
