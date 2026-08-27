---
'hotcrm': minor
---

Add a SaaS / multi-org composition of HotCRM, for operators running one
database with many tenant organizations behind a walled tenancy posture. The
community app is unchanged — build it the way you always have and you get the
same demo org, the same seed data and the same `system_admin` profile.

Build the new shape with `HOTCRM_COMPOSITION=saas`. Three registrations differ
and nothing else does; there is no runtime branch anywhere in the app, no
per-tenant switch to set, and no enterprise package to install — an artifact
built either way still runs on the community runtime.

**Every new tenant gets the product catalogue, and only the catalogue.** The
platform already gives each newly founded organization its own private,
editable, deletable copy of the app's seed data. What it replays is whatever
the app registers, so the SaaS composition registers the catalogue alone: a new
tenant needs priceable products on day one, and it does not need somebody
else's pipeline. The demo storytelling families — accounts, contacts, leads,
opportunities, cases, campaigns, contracts, quotes, forecasts — stay out of
tenant organizations entirely.

**The `demo_bootstrap` sweep is not registered in this shape.** It exists to
bind demo records to the first user of a demo install, and under a tenant wall
that is the wrong thing to do: it runs as the system, and a system context is
the one context an organization boundary does not apply to, so a single user id
would be stamped onto ownerless rows in every tenant's organization. The
catalogue also has no ownership column for it to claim, so nothing is lost by
leaving it out.

**A tenant administrator replaces the system administrator.** The new
`tenant_admin` profile holds the same authority over its own organization's
records that `system_admin` holds over a single-org install's — every object,
full CRUD, all-records depth, transfer and export — but it manages MEMBERS with
the organization-scoped `manage_org_users` capability instead of the
platform-wide `manage_users`, and it holds no platform-scoped capability at
all. `view_all_data` / `modify_all_data` are kept and mean what they say inside
the wall: every row of the tenant's own organization, regardless of owner. They
cannot reach further, because the organization boundary is applied beneath
permissions and sharing rather than by them.
