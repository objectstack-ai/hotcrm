---
'hotcrm': patch
---

The Details tab of the lead, opportunity and case record pages now shows the object's own field groups

Each of the three record pages used to list its own hand-picked sections, and
those sections had drifted from the field groups the object declares. Fields
that existed on the record were missing from the page. Each section now points
at one of the object's field groups, so the Details tab shows the same groups,
with the same headings and icons, as the rest of the app. A field added to a
group appears on the record page too.

**Leads.** The Details tab now shows Identity, Company Information, Contact
Information, Communication Preferences, Qualification, Assignment, Address,
Conversion, Duplicate Management and Additional Info. These fields could not be
seen on the Details tab before and now can: **Notes**, **Do Not Call**, **Email
Opt Out**, **Next Follow-up Date**, **Last Contacted**, **Need Type**,
**Estimated Amount**, **Conversion Approval** and the conversion result
(**Converted**, the converted account, contact and opportunity, and the
conversion date). **Description** is now inside **Additional Info**, together
with Notes. Address, Additional Info, Communication Preferences, Conversion and
Duplicate Management start collapsed: click the heading to open them.

**Opportunities.** The Details tab now shows Basic Information, Financials,
Classification, Campaigns, Sales Process, Forecast & Metrics and Notes & Next
Steps. Newly visible: **Primary Contact**, **Stage Entry Date**, **Approval
Status**, **Approved Date**, **Win Reason**, **Loss Reason**, **Loss/Win
Details**, **Days in Current Stage** and **Private**. Campaigns and Forecast &
Metrics start collapsed.

**Cases.** The Details tab now shows Case Information, Origin & Routing, SLA &
Priority, Escalation, Resolution and System. **Escalated Date** is shown for
the first time, under Escalation. **First Response Date** and **Resolved by
Article** are also new. Internal Notes moved to the System group. Escalation
and System start collapsed. SLA & Priority and Resolution appear once the case
has a value in them, for example when **Close Case** records the resolution.

Fields already shown in the strip at the top of the page (status, owner,
amount, priority and similar) still appear only there.
