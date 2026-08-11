---
'hotcrm': patch
---

Fixed the `crm_enterprise` app's `branding.logo` / `branding.favicon` pointing at `crm-logo.png` / `crm-favicon.ico`, neither of which was ever added to `assets/` — every Console page load hit two 404s. Repointed both to the existing `assets/icon.svg`, served live at `/runtime/assets/icon.svg` (the only mount the runtime actually serves app assets from; a plain `/assets/*` path — what was previously referenced — is not served at all).
