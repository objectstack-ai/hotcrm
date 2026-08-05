# hotcrm 17.0 rc.2 acceptance — retest playbook

Target: local hotcrm dev server at `http://localhost:4001`.

## Common setup (auth)

None of the ten issues states the auth endpoint explicitly. Assumed per task brief:

```bash
BASE=http://localhost:4001
curl -s -c /tmp/claude-0/-home-user/f9de7acc-06e5-5667-b535-06e82c336458/scratchpad/cookies.txt \
  -H 'Content-Type: application/json' \
  -X POST $BASE/api/v1/auth/login \
  -d '{"email":"admin@objectos.ai","password":"admin123"}'
# NEEDS DISCOVERY: verify this path (e.g. against server route list / login page network tab)
# before trusting 404s from the calls below.
CK="-b /tmp/claude-0/-home-user/f9de7acc-06e5-5667-b535-06e82c336458/scratchpad/cookies.txt"
```

All curl below assume `$BASE` and `$CK` are set. Record IDs (a case id, a lead id, an
opportunity id) must be fetched first from list endpoints (`/api/v1/data/<object>` per
issue #510's description of the data path) — issues do not pin concrete IDs.

---

## #508 — mass_update_stage is wired but cannot execute — every bulk-action invocation path is broken in console 16.1.0

**Labels:** bug, prio:p1, upstream:objectstack — **WRITES** (stage update on opportunities)

Three invocation paths, all broken (verified live 2026-07-28 against 16.1.0 console):

1. **Modal-path defect (REST-observable, RO probe):**
   ```bash
   curl -s $CK -o /dev/null -w '%{http_code}\n' \
     "$BASE/api/v1/meta/object/mass_update_stage"
   ```
   Issue says the console resolves the action's `target` as an OBJECT name and this GET
   returns **400** ("Error loading form"). This probe only mirrors the console's wrong call;
   the real fix signal is in the UI paths below.
2. **Selection-bar bulk button — UI only.** Select rows on the opportunity list, click
   "Mass Update Stage" in the selection bar. Broken = zero network requests + generic
   "Action completed successfully" toast (pure client no-op).
3. **Header toolbar button — UI only.** Multi-select then click the list_toolbar button.
   Broken = client-side rejection "This action runs on a single record — select exactly
   one row"; `input.selectedIds` never delivered.

**Direct REST invocation (the closure criterion from the issue):**
```bash
curl -s $CK -H 'Content-Type: application/json' \
  -X POST "$BASE/api/v1/actions/crm_opportunity/mass_update_stage" \
  -d '{"selectedIds":["<opp_id_1>","<opp_id_2>"],"params":{"stage":"<a_valid_stage>"}}'
# JSON body shape is not spelled out in the issue — selectedIds is the field named in it;
# param name for the stage needs discovery from the action metadata.
```

**Minimal Playwright outline (bulk-selection delivery cannot be tested via REST):**
open opportunity list → check 2+ row checkboxes → click "Mass Update Stage" in the
selection bar → assert a `POST /api/v1/actions/crm_opportunity/mass_update_stage`
request fires and its payload contains `selectedIds`.

**FIXED:** selection-bar click POSTs `/api/v1/actions/crm_opportunity/mass_update_stage`
with `selectedIds`, AND the body's UPDATEs apply (stages actually change). Note the issue's
explicit second condition: sandbox-body UPDATEs are additionally blocked by sharing
middleware when execution context has no user identity ("FORBIDDEN: insufficient
privileges to update") — that must also be fixed (same defect as #521) for full closure.
**STILL BROKEN:** no network request on click / success toast with no request / FORBIDDEN
from the body.

**Upstream refs:** none numbered in this issue (platform console/runtime defect, split
from hotcrm#491; app-side state lives on branch `claude/views-pages-dashboards-refs-850098` —
action now script-typed with `ctx.recordId` fallback). The FORBIDDEN half is
objectstack#3914 territory per #521.

---

## #509 — Global (objectless) body actions are unreachable — runtime registers them under 'global' but the dispatcher only probes '*'

**Labels:** bug, prio:p1, upstream:objectstack — **WRITES if fixed** (log_call/log_meeting create activity records); the broken-state probe is effectively RO

> Note: the issue body was truncated in retrieval (cuts off inside the "Dispatch
> (`POST /api/v1/actions/…`)" section) and the issue has no comments. The dispatch half
> below is corroborated by #522's source-audit comment (same defect, 17.0-rc side).

App ships two objectless actions: `log_call` and `log_meeting` (locations:
`record_header`, `list_item`, `record_related` — buttons render everywhere, as designed).
Runtime registration keys objectless actions under literal `'global'`
(`collectBundleActions` → `ql.registerAction`); the dispatcher probes a different key, so
dispatch never finds them.

**Repro (REST):**
```bash
# Normal object-scoped dispatch of a global action — broken path
curl -s $CK -H 'Content-Type: application/json' \
  -X POST "$BASE/api/v1/actions/crm_case/log_call" \
  -d '{"recordId":"<case_id>","params":{}}'

# Registration-key probe — per #522's audit this ACCIDENTALLY works because it hits
# the literal 'global' registration key:
curl -s $CK -H 'Content-Type: application/json' \
  -X POST "$BASE/api/v1/actions/global/log_call" \
  -d '{"recordId":"<case_id>","params":{}}'
```

**FIXED:** the first call executes the action body (inner `success:true`, activity/log
record written for the case).
**STILL BROKEN:** inner failure of the "not found" family (on 17.0-rc the exact shape is
documented in #522: HTTP 200, `{"success":true,"data":{"success":false,"error":"Action
'log_call' on object '*' not found"}}`), while the `/actions/global/log_call` probe
succeeds — proving the registration/dispatch key mismatch persists.

**Upstream refs:** none visible in the retrievable text (split from hotcrm#491;
"upstream `@objectstack/runtime` bug"). The 17.0-rc twin #522 tracks it upstream as
objectstack#3913.

---

## #510 — Analytics/dashboard query path resolves no user token — personal ("my …") dashboard widgets are impossible

**Labels:** bug, prio:p1, upstream:objectstack — **RO**

The list path (`/api/v1/data/...`) resolves `{current_user_id}`; the analytics path
(`/api/v1/analytics/...`) resolves NO user token — the literal string reaches the SQL
`WHERE`, matches nothing, widget shows 0. Empirical baseline from the issue:
`{current_user}` → 0, `{current_user_id}` → 0, no owner filter → 10,100,081. Date-macro
tokens DO resolve on the same path (so it is specifically user tokens).

**Repro:** the issue names the path only as `/api/v1/analytics/...` — the exact
endpoint/verb/body **need discovery** (open any dashboard in the console and copy the
analytics request it makes, then vary the filter). Three-way comparison, same dataset
(crm_case / case_metrics):

```bash
# 1) no owner filter            -> expect large count
# 2) filter owner={current_user_id} -> broken: 0 ; fixed: >0, scoped to admin's rows
# 3) control via LIST path, which already resolves the token:
curl -s $CK "$BASE/api/v1/data/crm_case?filter=..."   # e.g. the my_open_cases list view
```

**FIXED:** analytics response with `filter: { owner: '{current_user_id}', is_closed: false }`
returns the same rows the list-path "My Cases" view returns for admin (and the generated
SQL in the analytics response shows a substituted user id, not the literal token). Then,
per the issue's closure note: restore the widget on `service_dashboard` and retitle it
back to "My Open Cases by Priority".
**STILL BROKEN:** 0 rows with the token; literal `{current_user_id}` string visible in
the generated SQL.

**Upstream refs:** none recorded — the crm.app.ts note says "Filed upstream" but no
issue link was ever captured; this hotcrm issue exists precisely to track that gap.

---

## #520 — [17.0-rc] datetime 时间窗过滤返回空集（客服仪表盘全空）

**Labels:** bug, prio:p1, upstream:objectstack — **RO**

17.0 driver converts datetime comparison params to epoch-ms while the column stores ISO
text (`2026-07-26T00:00:00.000Z`) → comparison always false. Widget SQL:
`WHERE is_closed = ? AND created_date >= ? AND created_date <= ?`. `date`-typed fields
(close_date) are unaffected. Follow-up comment proved it also on 16.1.0 and found the rule
is directional: **`$lte` on a datetime matches 0 rows; `$gte` silently matches ALL rows**
(lower bound not applied).

**Repro (analytics query on the `case_metrics` dataset the service_dashboard widgets use —
exact analytics endpoint needs the same discovery as #510; vary only the created_date filter):**

| filter on `created_date` | broken (16.1/17.0-rc) | fixed |
|---|---|---|
| none | 38 rows | 38 |
| `$gte: 2026-05-01` only | 38 (unfiltered!) | rows actually ≥ bound |
| `$lte: 2026-07-30` only | **0** | ~38 |
| `$gte`+`$lte` last-30-days window | **0** | 29–30 (seed rows in window) |

**SQL cross-check (definitive, RO):**
```bash
sqlite3 <dev-db-file> "SELECT typeof(created_date), count(*) FROM crm_case GROUP BY 1"
# broken & fixed: text|38 — column stays ISO text
sqlite3 <dev-db-file> "SELECT count(*) FROM crm_case WHERE is_closed=0
  AND created_date >= '2026-07-06T00:00:00.000Z' AND created_date <= '2026-08-05T23:59:59.999Z'"
# manual ISO binding returns rows either way; the platform query must now match it
```
UI signal: service dashboard widgets non-zero with a `dateRange` on `created_date`.
Note: hotcrm #546 removed the `dateRange` block from `service_dashboard` on 16.1.0 and
added a CI guard failing any dashboard that windows a `datetime` field — to retest you
must re-add a dateRange (or query the analytics endpoint directly).

**FIXED means BOTH upstreams landed:** window returns in-window rows, AND a bare
`YYYY-MM-DD` `$lte` upper bound does not drop same-day records created after 00:00.
**STILL BROKEN:** `$lte` half → 0 rows, or `$gte` half unfiltered, or same-day drop.

**Upstream refs:**
- objectstack#3912 — this exact defect. **Closed as completed 2026-07-29, fix in the 17.0 train** → primary retest target for rc.2.
- objectstack#3777 — **open**, bug/priority:p1: bare-date `$lte` on datetime drops same-day records. Explicit precondition: #3912 alone does NOT make datetime windows safe.
- Lineage: introduced in 9.10.0 (objectstack#2034), detonated by 17.0 server-side placeholder resolution (objectstack#3582).
- Repro docs: branch `upgrade/objectstack-17`, `docs/upgrade-17/test-report.md` §3 P1.

---

## #521 — [17.0-rc] script action 的 body 写库被 FORBIDDEN（admin 用户）

**Labels:** bug, **prio:p0**, upstream:objectstack — **WRITES** (closes a case when fixed)

Object-level script actions (close_case etc.) fail at execution:
`FORBIDDEN: insufficient privileges to update crm_case` — even as built-in admin. Audit
line claims `body executes TRUSTED (context-less engine, RLS/FLS-bypassing)` then
`[BodyRunner] sandboxed action threw ... FORBIDDEN`. Root cause (source-confirmed):
`ctx.api` falls back to a facade with no ExecutionContext/isSystem (body-runner.ts:161-184);
plugin-sharing `canEdit` rejects on `!context.userId` (sharing-service.ts:255); hook
bodies have an `isSystem:true` fallback (engine.ts:978-981) that action bodies lack.

**Repro (issue path is UI: case detail → 关闭工单 → fill resolution → confirm; REST
equivalent of the same action dispatch):**
```bash
curl -s $CK -H 'Content-Type: application/json' \
  -X POST "$BASE/api/v1/actions/crm_case/close_case" \
  -d '{"recordId":"<open_case_id>","params":{"resolution":"rc.2 acceptance retest"}}'
# param name for the resolution field needs discovery from the action metadata
```

**FIXED:** action succeeds (no FORBIDDEN anywhere in response or server log) and
`GET $BASE/api/v1/data/crm_case/<id>` shows the case closed with the resolution set.
**STILL BROKEN:** red error in UI / response or `[BodyRunner]` server-log line containing
`FORBIDDEN: insufficient privileges to update crm_case`.
**Caution from the audit comment:** objects with public sharing or no owner field pass by
accident and mask the bug — retest on crm_case (owned + sharing-governed), not a
permissive object.

**Upstream refs:** objectstack#3914 (filed 2026-07-29; no fix-status update in comments —
still pending as of last comment). Affects close_case / escalate_case / send_email /
mass_update_stage / create_campaign. Repro docs: `upgrade/objectstack-17` test-report §3 P2.

---

## #522 — [17.0-rc] 全局（无 objectName）action 无法派发，且 UI 把失败当成功静默吞掉

**Labels:** bug, prio:p1, upstream:objectstack — **WRITES if fixed** (log_call writes an activity); broken-state probe effectively RO

**Repro (exact, from issue):**
```bash
curl -s $CK -H 'Content-Type: application/json' \
  -X POST "$BASE/api/v1/actions/crm_case/log_call" \
  -d '{"recordId":"<case_id>","params":{}}'
```
Broken response — **HTTP 200** with:
```json
{"success":true,"data":{"success":false,"error":"Action 'log_call' on object '*' not found"}}
```
Same for `export_csv`; flow-type actions through this endpoint give the same (misleading)
error. Registration-key probe (from the audit comment — accidentally works while broken):
`POST $BASE/api/v1/actions/global/log_call`.

**FIXED (defect 1, dispatch):** inner `data.success:true` and the action body actually ran
(call logged). **STILL BROKEN:** inner `"not found on object '*'"`.
**FIXED (defect 2, envelope/UI):** a failing handler surfaces as an error to the user —
either a non-200 / outer `success:false`, or (console half, objectui#2958) the UI reads
the inner envelope and shows an error toast instead of silently closing. UI half needs a
browser check: trigger 全局 action from a record header while it still fails server-side
and assert an error is displayed (no silent modal close).

**Upstream refs:**
- objectstack#3913 — runtime half: registration key `'global'` (app-plugin.ts:640-644) vs REST fallback lookup `'*'` (domains/actions.ts:195-204), exact-match engine (engine.ts:731-746); all handler failures wrapped into HTTP 200 via `deps.success()`. Filed 2026-07-29; no closure noted in comments.
- objectui#2958 — console only checks the outer envelope. Filed; no closure noted.
- Repro docs: `upgrade/objectstack-17` test-report §3 P3.

---

## #524 — [17.0-rc] flow 型 action 菜单项无响应；screen flow 服务端失败无任何 UI 回显

**Labels:** bug, **prio:p0**, upstream:objectstack — **WRITES** (lead conversion creates account/contact/opportunity on success)

Two phenomena; **phenomenon 1 is already RESOLVED CRM-side** (per 2026-07-30 comment),
issue kept open as regression-retest hook for phenomenon 2.

**Phenomenon 1 (dead "Convert Lead" menu item) — retest is a regression check only:**
cause was legacy string `rowActions: ['convert_lead']` in the lead view (removed by #535,
merged via #537). Verified on 16.1.0: single 「转化线索」 entry, confirm dialog appears,
and network shows `POST /api/v1/automation/lead_conversion/trigger → 200 OK` with the
"Conversion Details" first screen rendering. objectui#2960 (string rowActions dispatched
as a type → silent no-op + green toast) still exists upstream but hotcrm no longer hits it.
- **REGRESSED:** an untranslated "Convert Lead" row-menu entry that clicks with zero
  requests + green success toast.

**Phenomenon 2 (screen-flow server failure with zero UI feedback) — UI-only, still blocked
on platform.** Original repro: lead list → row menu → 转化线索 → fill → Submit; server log
shows `Insert operation failed {"object":"crm_account","error":"industry must be one of: ..."}`
while the UI closes the modal with no error and lead status unchanged.
**Important caveat from the comments:** the original failure root cause (#531 industry
enum) was fixed via shared picklists (#490/#516), so the original path may no longer fail —
**you must construct another server-side failure** (any insert/validation failure inside
the flow) to retest the silent-swallow behavior.

**Minimal Playwright outline:**
1. Arrange a flow step that will fail server-side (e.g. seed/point the conversion at data
   violating a validation rule).
2. Lead list → row menu → 转化线索 → fill Conversion Details → Submit.
3. Capture server log confirming the failure occurred.
4. FIXED: UI shows an error (toast/inline), modal does not silently close, lead unchanged
   is explained. STILL BROKEN: modal closes, no message, no state change, nothing in UI.

**Upstream refs:**
- objectui#2958 — `useConsoleActionRuntime.tsx:479-494` treats `{success:false}` (no status/screen) as terminal success; open.
- objectstack#3915 — REST `/api/v1/actions` endpoint has no flow dispatch (MCP path does); open.
- objectstack#3913 — failures wrapped in 200 envelope (shared with #522); open.
- objectui#2960 — string rowActions path; still valid upstream but no longer needed for hotcrm.
- hotcrm #531 (industry enum, root cause of the original failure) — fixed by #490/#516.
- Repro docs: `upgrade/objectstack-17` test-report §3 P5.

---

## #525 — [17.0-rc] 多 tab 新建表单校验失败后丢失已填值且布局错乱

**Labels:** bug, **prio:p0**, upstream:objectstack (assignee: yinlianghui) — **WRITES-intent** (attempts case create; while broken nothing persists — no cleanup needed unless fixed path completes a create)

**UI-only by nature** — REST create works fine (issue states this explicitly); the defect
is the console multi-tab modal (each tab its own react-hook-form + `<form>` sharing a
formId; footer submits only the first form; Radix TabsContent without forceMount unmounts
and destroys values on tab switch — ModalForm.tsx:518 KNOWN LIMITATION).

**Critical retest caveats from the comments (2026-07-31):**
- On current `main` (16.1.0, after #515) `description` (required) moved to the FIRST tab —
  the "required fields spread across tabs" premise no longer exists there, and NONE of the
  three phenomena reproduce on main.
- The original repro was made on `upgrade/objectstack-17` at `dd70aff0`, **79 commits
  behind main** (its form lacked `description` entirely — #506). **Merge main into the
  upgrade branch first, then retest**; phenomenon ① may vanish, leaving ②③ as the real
  objectui scope. To exercise ②③ you need a form whose required fields genuinely span
  tabs (or temporarily author one).

**Minimal Playwright outline (17.0-rc console, post-merge):**
1. Case list → 新建 (Case / SLA / Resolution tabs).
2. Fill Case tab: subject=`MULTITAB-PROBE-RC2`, account, status, priority → Submit.
3. Assert error identifies the missing field AND its tab (① fixed) vs a bare
   `description is required` with no tab hint (① broken).
4. Switch to Resolution, fill description, Submit.
5. FIXED: previously filled values retained (subject still `MULTITAB-PROBE-RC2`), single
   remaining-field error, tabs render intact, messages localized (中文).
   STILL BROKEN: `subject is required; description is required; status is required;
   priority is required` (all values lost), then tab headers vanish / broken scrolling;
   English engine messages.

**Upstream refs:**
- objectui#2959 — the multi-tab form defect as filed; open.
- objectui#2153 — closed, but the explicit-sections path was NOT fixed in RC.
- objectstack#3918 — runtime dispatcher drops ValidationError `fields[]` and degrades to 500 (REST path unaffected); filed, no closure noted.
- Repro docs: `upgrade/objectstack-17` test-report §3 P6.

---

## #526 — [17.0-rc] os migrate apply 对运行中服务正在使用的 SQLite 库缺少占用检测

**Labels:** bug, prio:p2, upstream:objectstack — **WRITES** (runs DDL against the dev DB; do this on a disposable copy/seed, never the shared dev DB)

**CLI repro (no REST):**
1. Start the dev server so it holds the SQLite DB open.
2. Against the SAME database file, run `os migrate apply` including a rebuild-type change
   (e.g. `replace_unique_index`).
3. Broken: no occupancy warning, no refusal — apply proceeds. Also (audit comment):
   `runtime.start()` runs schema-sync DDL BEFORE the confirmation prompt.

**FIXED:** CLI detects the DB is in use and warns or refuses unless `--force` (the
issue's requested behavior). **STILL BROKEN:** silent apply with server running.
Note the audit correction: the risk is stale prepared statements / SQLITE_BUSY, not file
inode replacement (replace_unique_index is pure index DDL; SQLite column rebuilds swap
tables inside the same file, sql-driver.ts:2816-2877) — data corruption was never actually
reproduced (preventive report).

**Upstream refs:** objectstack#3917 (filed 2026-07-29 with corrected facts; no closure
noted). Repro docs: `upgrade/objectstack-17` test-report §3 P7.

---

## #528 — [CRM] 9 个孤儿 __search 列待清理（17.0 收紧搜索伴生列供给条件后遗留）

**Labels:** bug, metadata, prio:p2 (assignee: yinlianghui; state: reopened) — **RO** (plan/inspect ONLY — the original cleanup advice is RESCINDED)

**⚠️ Verdict reversed in comments: DO NOT run `os migrate apply --allow-destructive`.**
The 9 `__search` columns (crm_competitor, crm_opportunity_line_item, crm_quote_line_item,
crm_task, sys_metadata, …) are NOT orphans — they are live pinyin-search companion columns
supplied by the dev runtime. `os migrate plan` misjudges them because the migrate CLI and
the dev runtime disagree on the schema view. Destructive apply would delete working search
columns (and dev would likely recreate them). Issue was auto-closed 2026-07-30 by a stray
`Closes #528` in a #542 commit message and manually reopened — the reopened state is
correct. `docs/MAINTENANCE.md` §3.1 (main) records this as a known false positive
("do not touch until #3955 lands").

**Retest (all read-only):**
```bash
# 1) plan against the live dev DB — broken: 9 objects flagged with DB-only __search columns
os migrate plan
# 2) column-level evidence:
sqlite3 <dev-db-file> "PRAGMA table_info(crm_task)"   # broken: 34 cols incl. __search
# 3) control: a fresh DB created by migrate itself shows 33 cols, no __search, and plan
#    reports 0 destructive (per the comment's two-fresh-DB experiment); a dev-runtime-built
#    fresh DB shows 34 incl. __search. Also note the reported asymmetry: a brand-new DB
#    immediately shows 3 relax_unique_index drift entries.
```

**FIXED (i.e. objectstack#3955 landed):** `os migrate plan` no longer flags the runtime's
`__search` companion columns as DB-only/destructive (CLI and runtime schema views agree),
and the fresh-DB asymmetry is gone. **STILL BROKEN:** plan still lists the 9 `__search`
columns as destructive drops. In no case apply the drop.

**Upstream refs:** objectstack#3955 (open, blocking; includes the repro table and the
relax_unique_index asymmetry). Related process refs: hotcrm #542 (maintenance manual),
#526 (stop the server before any apply). Repro docs: `upgrade/objectstack-17`
test-report §4 L2.

---

## Upstream fix-status summary (as claimed in the comments read above)

| Upstream issue | Subject | Claimed status |
|---|---|---|
| objectstack#3912 | datetime filter params → epoch-ms vs ISO text (#520) | **Closed as completed 2026-07-29, fix in 17.0 train** — prime rc.2 retest |
| objectstack#3777 | bare-date `$lte` drops same-day datetime rows (#520 precondition) | **Open**, bug/priority:p1 |
| objectstack#3913 | global-action key mismatch + failures in 200 envelope (#509/#522/#524) | Filed, no closure noted |
| objectstack#3914 | action body ctx.api without user identity → FORBIDDEN (#521/#508) | Filed, no closure noted |
| objectstack#3915 | REST actions endpoint lacks flow dispatch (#524) | Filed, no closure noted |
| objectstack#3917 | migrate apply lacks in-use DB detection (#526) | Filed, no closure noted |
| objectstack#3918 | dispatcher drops ValidationError fields[], degrades to 500 (#525) | Filed, no closure noted |
| objectstack#3955 | migrate CLI vs dev runtime schema-view mismatch (#528) | **Open, blocking #528** |
| objectui#2958 | console reads only outer success envelope (#522/#524) | Filed, no closure noted |
| objectui#2959 | multi-tab modal form value loss/layout (#525) | Filed, no closure noted |
| objectui#2960 | string rowActions dispatched as type → silent no-op (#524) | Filed; hotcrm no longer affected (#535/#537) |
| objectui#2153 | earlier multi-tab issue | Closed, but explicit-sections path not fixed in RC |
