<p align="center">
  <img src="assets/icon.svg" alt="HotCRM" width="128" height="128"/>
</p>

# HotCRM

> **The reference app for AI-written enterprise software.** A complete CRM —
> 18 objects, 26 flows, 5 dashboards, 6 AI skills, 4 languages — is roughly
> **170k tokens** of typed [ObjectStack](https://github.com/objectstack-ai/objectstack)
> metadata (~18,000 lines): the entire enterprise CRM fits in a single agent
> context window, so an AI can hold it whole, reason about it, and refactor it.
> **Install it online in one click, or fork it and build & ask with Claude
> Code** — it's the reference implementation every marketplace app forks from.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-app.objectstack.hotcrm-blueviolet)](objectstack.config.ts)
[![Version](https://img.shields.io/badge/version-2.2.2-brightgreen)](CHANGELOG.md)
[![Marketplace](https://img.shields.io/badge/marketplace-cloud.objectos.app-orange)](https://cloud.objectos.app)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/objectstack-ai/hotcrm)

HotCRM is a complete, opinionated CRM built as the **first official application** on the [ObjectStack](https://cloud.objectos.app) marketplace. Install it into any ObjectStack environment in one click and get a working CRM in 30 seconds — or fork it as the canonical example of how to build your own marketplace app.

> **Try it in your browser (no install):** click the StackBlitz badge above. It boots HotCRM in a WebContainer using `@objectstack/driver-sqlite-wasm` (sql.js) instead of `better-sqlite3`, which can't compile inside the WebContainer sandbox. `.stackblitzrc` sets `OS_DATABASE_DRIVER=sqlite-wasm` so the runtime picks the WASM driver automatically. The sandbox boots with `npm install --omit=dev --omit=optional` — WebContainers forbid `npm i -g`, and their bundled pnpm 8 can't read this repo's lockfile. `package-lock.json` is committed for that install only (nothing else in the repo reads it): without it npm re-resolves ~500 packages on every cold container, which is the difference between a 15-second install and a six-minute one. It also sets `OS_OIDC_PROVIDER_ENABLED=false`: the OIDC provider signs tokens with Ed25519, which the WebContainer's WebCrypto can't generate, and the failure surfaced as a 500 on login. Sign in with `admin@objectos.ai` / `admin123`. Local development still uses pnpm 10 with every feature on.

---

## 📸 Screenshots

| Qualified lead workspace | Sales pipeline |
|---|---|
| ![Qualified lead workspace](assets/screenshots/hotcrm/lead-detail/en.png) | ![Sales pipeline](assets/screenshots/hotcrm/sales-pipeline/en.png) |

| Strategic account 360 | Quote lifecycle |
|---|---|
| ![Strategic account 360](assets/screenshots/hotcrm/customer-360/en.png) | ![Quote lifecycle](assets/screenshots/hotcrm/quote-pipeline/en.png) |

| Campaign lifecycle and ROI | Sales performance dashboard |
|---|---|
| ![Campaign lifecycle and ROI](assets/screenshots/hotcrm/campaign-detail/en.png) | ![Sales performance dashboard](assets/screenshots/hotcrm/sales-dashboard/en.jpg) |

> The current, locale-specific screenshots live in `assets/screenshots/hotcrm/<screen>/<locale>.png`, with a colocated `meta.yaml` for purpose, alt text, capture context, and lifecycle. This README uses English; the documentation site also publishes `zh-Hans` variants. Bundled runtime translations: en, zh-CN, es-ES, ja-JP.

---

## ✨ What you get

**18 business objects** spanning the full Lead-to-Cash cycle:

| Sales | Service | Marketing | Revenue |
|---|---|---|---|
| `crm_lead` | `crm_case` | `crm_campaign` | `crm_contract` |
| `crm_account` | `crm_knowledge_article` | `crm_campaign_member` | `crm_quote` |
| `crm_contact` | `crm_task` | | `crm_quote_line_item` |
| `crm_opportunity` | | | |
| `crm_opportunity_line_item` | | | |
| `crm_product` | | | |
| `crm_forecast` | | | |
| `crm_event` | | | |
| `crm_event_attendee` | | | |

Plus **6 AI skills** (a skills-only surface — HotCRM defines no agents of its own; the skills attach to the platform `ask` assistant), **5 dashboards**, **26 flows**, **30 actions**, **9 datasets**, **4 language bundles** (en, zh-CN, es-ES, ja-JP), **6 permission profiles**, **12 positions**, and **9 sharing rules**.

> **Business reader?** The ObjectStack docs tour every one of these capabilities in plain business language — [What Can It Do?](https://objectstack.ai/docs/capabilities) — with HotCRM as the running example on every page.

---

## 🚀 Install from the marketplace (recommended)

1. Sign in at [cloud.objectos.app](https://cloud.objectos.app).
2. Open **Marketplace → HotCRM** and click **Install** into your environment.
3. Open your environment URL — HotCRM is wired into the Studio shell. Done.

> First-time on ObjectStack? Create an environment from the **Starter** template first, then install HotCRM on top.

---

## 🛠 Run locally (development / fork it)

```bash
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm
pnpm install
pnpm dev                    # ObjectStack runtime starts at http://localhost:4001
```

```bash
pnpm typecheck              # strict TypeScript
pnpm build                  # produces dist/objectstack.json (the publishable artifact)
```

The compiled `dist/objectstack.json` **is** the package — that's what gets uploaded to the marketplace.

---

## 📦 Publish a fork to the marketplace

After you've forked, customized, and renamed the package:

```bash
# 1. Authenticate once (writes ~/.objectstack/cloud.json)
objectstack cloud login

# 2. Build the artifact
pnpm build

# 3. Publish a new version
objectstack package publish dist/objectstack.json \
  --manifest-id app.acme.crm \
  --version 2.2.2 \
  --display-name "Acme CRM" \
  --category crm \
  --visibility marketplace \
  --note "Initial release"
```

The CLI is idempotent: re-running with the same `--manifest-id` updates the package; new `--version` values create immutable versioned snapshots.

See [docs: Publishing your first marketplace app](content/docs/marketplace/publishing-your-first-app.mdx) for the full walkthrough.

---

## 🏗 Repository layout

```
hotcrm/
├── objectstack.config.ts         # manifest + defineStack() — single source of truth
├── src/
│   ├── objects/                  # *.object.ts — data model (18 objects)
│   ├── actions/                  # *.actions.ts — server actions + AI tools (30)
│   ├── flows/                    # *.flow.ts — visual flows (26): screen, record-change & scheduled
│   ├── hooks/                    # hook registry barrel
│   ├── skills/                   # *.skill.ts — AI skills (6) — skills-only surface, no agents
│   ├── datasets/                 # *.dataset.ts — analytics semantic layer (9)
│   ├── dashboards/, reports/     # analytics UI
│   ├── pages/, views/, apps/     # UI definitions
│   ├── profiles/, sharing/       # security
│   ├── translations/             # en / zh-CN / es-ES / ja-JP
│   └── data/                     # seed data
├── apps/docs/                    # Fumadocs site — standalone, own lockfile (not a pnpm workspace member)
└── content/docs/                 # Documentation content
```

Every file follows the **`<entity>.<kind>.ts`** convention (actions are the one plural: `<entity>.actions.ts`, one file bundling that entity's actions). The `crm_` prefix on object names is explicit in source — no runtime magic. Both rules are required for marketplace acceptance.

---

## 📚 Documentation

- **Live docs:** start `pnpm -C apps/docs install && pnpm -C apps/docs dev -p 3001`, then open <http://localhost:3001/docs>
- **For business users:** Sales, Service, Marketing, Revenue, AI Copilot guides
- **For developers:** Architecture, Customization, API reference, Testing & CI
- **For publishers:** Marketplace publishing guide

---

## 🤝 Why fork HotCRM?

Because it's the reference for every ObjectStack convention you'll encounter:

- ✅ `crm_` namespace prefix on every object (explicit, grep-able, marketplace-safe)
- ✅ Strict `*.object.ts` / `*.hook.ts` / `*.action.ts` separation of concerns
- ✅ All metadata validated against `@objectstack/spec` schemas
- ✅ ObjectQL only — no raw SQL anywhere
- ✅ AI-Native — every entity has an `*.action.ts` that's also an AI tool
- ✅ Four-language i18n out of the box
- ✅ Production-shaped sharing rules, profiles, and positions

If you want to ship an HR app, a project tracker, a help-desk — start by reading HotCRM's structure, then change names.

---

## 📄 License

Apache-2.0. See [LICENSE](LICENSE).
