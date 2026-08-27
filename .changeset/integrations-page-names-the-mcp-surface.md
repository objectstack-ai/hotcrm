---
---

Name the two platform surfaces the integrations guide never mentioned, in all
three locales. The page's **What ships today** list described the data API,
export, import, outbound email, in-app notification and your own code — and
omitted `/api/v1/mcp`, an access surface that is **on by default**: the CLI
appends `mcp` to `requires` whenever `isMcpServerEnabled()` is true, which it is
unless `OS_MCP_SERVER_ENABLED` says otherwise, and nothing in this repo says
otherwise. For a product that calls itself AI-Native, the integrations page not
mentioning its own agent front door was the one line it most needed.

The same omission left two entries unexplained. An administrator opening
**Setup → Integrations** sees *Connect an Agent* and *Datasources*; no page in
`content/docs` said what either one was. Neither is a vendor connector and
neither is declared by HotCRM — `Connect an Agent` is contributed by
`@objectstack/mcp`, `Datasources` by `@objectstack/service-datasource`, which
the CLI mounts unconditionally so a self-host runtime is a complete low-code
platform out of the box.

Confirmed in a browser before a word of it was written, because registration is
not rendering: the app was booted on a seeded admin database, signed into as an
administrator, and both entries were seen to render under **Setup →
Integrations** and to open working pages. Both sit behind the group's
`manage_platform_settings` gate and neither entry adds one of its own.

`webhooks` is deliberately still absent from the list — unlike the other two it
genuinely is not loaded, so the page is right to omit it.

Docs-only — three `.mdx` files and nothing else — so the frontmatter above is
deliberately empty: this PR publishes nothing to HotCRM users.
