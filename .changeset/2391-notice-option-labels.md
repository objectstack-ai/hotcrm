---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Notices name the stage and the priority by their labels, in the reader's language (#2391).** The stalled-deal notice said "Opportunity Apex Logistics Data Hub has sat in needs_analysis for 33 days", and the Chinese one 「已在“needs_analysis”阶段停留」: the stage's stored value, not the name the screens show. It now reads "has sat in Needs Analysis" in English, 「已在“需求分析”阶段停留」 in Chinese, "Análisis de Necesidades" in Spanish and 「ニーズ分析」 in Japanese, the same words the stage picker shows. The case escalation and SLA breach notices printed the priority the same way, "Case CS-0001 (critical)", and now say "(Critical)", 「（严重）」, "(Crítica)", 「（重大）」. The inbox and the email carry the same text.

**Upgrading.** Nothing to run. The three templates take new variables: `crm.deal_stalled` reads `stage_label`, and `crm.case_escalated` and `crm.case_sla_breach` read `priority_label`, each holding the label in every language the app ships (`{{stage_label.en}}`, `{{stage_label.zh_CN}}`, `{{stage_label.es_ES}}`, `{{stage_label.ja_JP}}`). The old `stage` and `priority` variables are no longer passed, so a copy of one of these templates edited in Studio that still prints `{{stage}}` or `{{priority}}` shows a blank there; change it to the label variable of its language.
