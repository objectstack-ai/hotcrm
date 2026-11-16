---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**My Open Cases by Priority counts past-SLA cases the way the Open Cases Past SLA tile beside it does (#2525).** The table read `avg_sla_violated`, the stored flag, which only the hourly `case_sla_monitor` sweep writes on an open case, and the sweep ships off. So on a hosted tenant the tile counted 23 open cases past SLA while the table read 0.0% for the medium and low queues. `case_metrics` gains `past_sla_count`, the tile's own selection as a measure (flagged, or not yet resolved and past `sla_due_date`, compared with `{now}` at read time), and `past_sla_rate` = `past_sla_count` ÷ `case_count`. The table shows Cases, Past SLA and Past SLA Rate. Labels are added in the three non-English packs, and the widget description and the Dashboards page (three locales) are updated. `avg_sla_violated` stays for the closed-case report, where the flag is written at close.
