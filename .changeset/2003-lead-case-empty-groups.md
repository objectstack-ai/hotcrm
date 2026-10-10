---
'hotcrm': patch
---

A lead's and a case's Details tab now keep the sections you are expected to fill on screen while they are empty

A section with nothing filled in used to disappear from the Details tab. On a
new lead that carries only its required fields, that hid Contact Information,
Address and Additional Info, so there was no place to see, or fill in, the
lead's **Mobile**, **Website**, **Address**, **Annual Revenue**, **Number of
Employees**, **Description** or **Notes**. On a new case it hid Origin &
Routing, and with it **Case Origin**.

These four sections now always show, with an empty row for each field. Address
and Additional Info still start collapsed: click the heading to open them. A
section that has at least one value looks the same as before, with its empty
fields behind **Show N empty fields**. The opportunity page already worked this
way.

Sections that are filled in later, or by the app, still appear only once they
hold a value. On a lead that is Duplicate Management, which the duplicate check
fills in. On a case it is SLA & Priority, whose dates are recorded for you, and
Resolution, which **Close Case** records. Assignment is unchanged: the lead
owner is shown in the strip at the top of the page.
