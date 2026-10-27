# Track 5 (Setup) — running notes

Interim notes, pushed as the pass goes so a stop loses nothing. `REPORT.md` is the deliverable.

- Tested sha: hotcrm `main` `1f3f888` (`@objectstack/*` 18.2.0), fresh DB, dev admin, `pnpm demo:staff` exit 0.
- Done so far: Setup map (40 pages), positions, permission sets, declared sharing rules, approvals pages,
  marketing user created through Setup (Create User, then position holder), all 6 personas' landing and
  every sidebar entry clicked, record-access matrix, field-level security (API + edit form), export gate.

## Defects so far
1. Marketing user sees **Service Overview** in the sidebar; it opens 9 tiles of "You don't have access"
   (403 on `/api/v1/analytics/dataset/query`). Gate `NOT_A_SALES_REP` at `src/service/index.ts` (nav_service_dashboard)
   asks only the position, not `current_user.can("crm_case","read")`. Shot `41-mkt-noaccess-service_overview.png`.
2. Marketing user: **Sales Performance** dashboard shows 2 "no access" tiles (403). Shot `41-mkt-noaccess-sales_performance.png`.
3. Inventory drift: PRM-006 says eleven sharing rules; main ships 12 (`forecast_manager_sharing`, #2282). Setup lists 12.
4. Setup permission-set editor has no Export column (C R U D Tr VA MA only), while the position page's summary
   shows E; `allowExport` (PRM-004) cannot be seen on the set itself. Platform console.

## UI/UX suggestions so far
- Permission-set editor: the Assigned Users panel is pinned over the object grid, leaving ~5 rows visible;
  right-hand columns (Bulk, field count) are cut off at 1440px. Shots 14, 16.
- Create User dialog: Permission Set is a free-text box with no picker, and no Position field, though HotCRM grants by position. Shots 30–32.
- Add holder dialog lists names only, no email. Shot 35.
- Packaged automation: toggle shows On (green) beside "Not running here" for scheduled flows; the reason names an env var. Shot 12.
- Setup list titles are singular ("Position", "Permission Set") and lead with the API name column.
- Console home tile for HotCRM is magenta; the app brand is orange. Shot 00 vs 20.
- Service personas see Opportunities / My Deals (empty) by design (#2231); service_agent set description still says "see no opportunities".
- Exec dashboard Pipeline by Stage axis shows raw `NeedsAnalysis` (track 4 cross-note).
