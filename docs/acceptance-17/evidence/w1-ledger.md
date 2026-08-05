# RC1ACC-W1 Data Ledger

All records created by W1 during the 17.0.0-rc.2 acceptance run. **All deleted; 0 leftovers verified.**
Final verification scan: `LEFTOVER RC1ACC-W1 RECORDS: 0` across all 17 objects.

| # | Object | ID | Name / label | DELETE |
|---|--------|----|--------------|--------|
| 1 | crm_account | C0nPYZmo0VY1XZ1q | RC1ACC-W1-Acme Industrial | 200 |
| 2 | crm_account | xr_uuhWHBy20Yl-A | RC1ACC-W1-UI Account (UI form) | 200 |
| 3 | crm_account | XnswVU4p3NRlVnMg | RC1ACC-W1-Navy Systems Corp (C3 convert) | 200 |
| 4 | crm_account | T0zMC76xUMvcD--T | RC1ACC-W1-Bletchley Analytics (C3 convert) | 400 → **200 on retry** |
| 5 | crm_contact | QpQV0XJFcR1WkU7A | RC1ACC-W1-Ada Lovelace | 200 |
| 6 | crm_contact | wFyQmEQI49uFyp9v | RC1ACC-W1-Grace Hopper (C3 convert) | 200 |
| 7 | crm_contact | DLYEv33yitW1UPf0 | RC1ACC-W1-Alan Turing (C3 convert) | 400 → **200 on retry** |
| 8 | crm_lead | DAZbCqzw-wxQwV2T | RC1ACC-W1-Grace Hopper | 200 |
| 9 | crm_lead | Vdevm-f8EtXaVTff | RC1ACC-W1-Alan Turing | 200 |
| 10 | crm_opportunity | x-OZsTliHqIUeSjh | RC1ACC-W1-Platform Deal (C1) | 200 |
| 11 | crm_opportunity | f1RWTRo2X-T6SF8O | RC1ACC-W1-Open Rollup Deal (C5) | 200 |
| 12 | crm_opportunity | M5zWCn0cfE7HgseX | RC1ACC-W1-UI Opp (UI form + C4 drag) | 200 |
| 13 | crm_opportunity | OYGW35Bu4tPbjLaX | RC1ACC-W1-UI Opp (dup from timed-out run) | 200 |
| 14 | crm_opportunity | 8uv9Mk4OrC4n_cmN | RC1ACC-W1-Converted Opp (C3) | 400 → **200 on retry** |
| 15 | crm_product | FC-tjJLj_3wvPLId | RC1ACC-W1-Enterprise Seat | 200 |
| 16 | crm_quote | 61XYdhuseVfTikfL | RC1ACC-W1-Q1 Quote | 200 |
| 17 | crm_contract | Jf7e0OOFRfm-g2gg | CTR-0001 (RC1ACC-W1-Master Subscription) | 200 |
| 18 | crm_case | XDtvf66Sf3ge5zZb | RC1ACC-W1-Login failure | 200 |
| 19 | crm_case | J2RCLvqD1bFUHv5w | RC1ACC-W1-UI Case (UI form) | 200 |
| 20 | crm_campaign | KUTaiMnn-oYO9rcO | RC1ACC-W1-Summer Webinar | 200 |
| 21 | crm_forecast | HPj0OVb3sckgicFh | RC1ACC-W1-Q3 2026 | 200 |
| 22 | crm_knowledge_article | eCH1gIWCmOpDDZZK | RC1ACC-W1-How to reset SSO | 200 |
| 23 | crm_task | MI_idX5qwudf7xT2 | RC1ACC-W1-Follow up call | 200 |
| 24 | crm_event | 5iaCvHN1DccFu0bG | RC1ACC-W1-Discovery Call (C6) | 200 |
| 25 | crm_event | jLfNMx5361zHbj_1 | RC1ACC-W1-UI Event (UI form) | 200 |
| 26 | crm_event_attendee | oitrSpODtdT2xeLq | EA-00001 (C6) | 200 |
| 27 | crm_opportunity_line_item | AI0J0WMC_mc9h_5L | RC1ACC-W1-OLI | 200 |
| 28 | crm_opportunity_line_item | XJ1GzZGM-83omZBV | RC1ACC-W1-OLI2 (C5) | 200 |
| 29 | crm_quote_line_item | N5F0MwLxnPObA1qC | RC1ACC-W1-QLI | 200 |
| 30 | crm_campaign_member | _cDCxbMUxtUk716- | CM-00001 | 200 |

## Hook/flow side-effect records (created BY my test data, also removed)

| Object | ID | Subject | DELETE |
|--------|----|---------|--------|
| crm_task | eLuXDag-mtdP2ZSp | Follow up with qualified lead (DAZbCqzw-wxQwV2T) | 200 |
| crm_task | EqLaX3OvzpmCpuH3 | Escalated case XDtvf66Sf3ge5zZb needs attention | 200 |
| crm_task | zZtM2WoDw0O1RpGA | Activate new customer for opportunity x-OZsTliHqIUeSjh | 200 |

Also deleted: one throwaway probe account `7KfnnI5MSmeMOU2X` (RC1ACC-W1-Probe), DELETE 200.

**No seeded record was modified or deleted at any point.**

## Delete-ordering note

Three deletes returned 400 on the first pass purely because of ordering — the converted-lead chain
(lead → account/contact/opportunity) must be torn down opportunity-last-but-lead-first. All three
succeeded on retry once the converted lead row was gone. See NEW-3 in RESULTS.md for the misleading
error text this surfaces.
