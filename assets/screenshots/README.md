# HotCRM screenshots

`assets/screenshots/hotcrm/` is the repository-owned source of truth for
published HotCRM product screenshots. README and documentation-site images must
reference a screen from this directory, never an ad hoc capture.

Each screen is a self-contained directory:

```text
hotcrm/<screen>/
├── meta.yaml       # ID, capture context, title, alt text, purpose, lifecycle
├── en.png|jpg      # English image
└── zh-Hans.png|jpg # Simplified Chinese image
```

`meta.yaml` is deliberately colocated with the two locale files so a visual,
its accessible description, its intended story, and its capture conditions
evolve together. `status: published` means the asset may be used in public
README and docs content.

## Documentation site

The docs site consumes generated copies under
`apps/docs/public/screenshots/hotcrm/`; that output is ignored by Git. Run:

```bash
pnpm -C apps/docs sync:screenshots
```

The `dev`, `types:check`, and `build` scripts run this sync automatically.
Use public paths such as `/screenshots/hotcrm/lead-detail/en.png` from MDX.

## Adding or refreshing a screen

1. Capture the same reviewed product state in `en` and `zh-Hans`.
2. Replace both locale files and update their colocated `meta.yaml` in one
   change. Keep the real file extension (`.jpg` for JPEG, `.png` for PNG).
3. Run the sync command and verify both documentation locales in a browser.
4. Update the README or docs page that tells the corresponding product story.

The numbered files at this directory's root are retained as historical capture
sets. New product documentation should use the semantic `hotcrm/<screen>/`
directories above.
