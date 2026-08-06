---
'hotcrm': patch
---

Let the opportunity detail page's reference rail take its card headings from the
translation bundle, and stop one of them claiming a filter the component cannot
apply.

The three entries in `src/pages/opportunity_detail.page.ts` each declared a
literal English `title` — `Quotes`, `Products`, `Open Tasks`. The rail resolves a
heading as `entry.title || i18n.objectLabel({ name: objectName, … })`, so a
literal does not supply a default: it wins, and the locale bundle is never
consulted. `objects.crm_quote.label`, `objects.crm_opportunity_line_item.label`
and `objects.crm_task.label` are translated in all four locales this app ships,
yet the rail printed English into every one of them. Dropping the three literals
hands the heading back to the translation bundle, so the cards now read 报价单 /
商机产品明细 / 任务 in Simplified Chinese and follow any locale added later
without a page edit.

Two consequences worth knowing before you look at the page:

- The English headings change with it, from the plural nouns the literals spelled
  to the objects' own singular labels — **Quote**, **Opportunity Line Item**,
  **Task**. The rail reads `label`, never `pluralLabel`, so a plural heading is
  not reachable from metadata today.
- The task card loses the word *Open*, which it was never entitled to. A rail
  entry carries no filter and cannot be given one — the rail queries
  `{ $filter: { [relationshipField]: parentId }, $top: limit }` and reads nothing
  else off the entry — so that card has always counted and listed this deal's
  tasks whatever their status. The genuinely filtered view is the **Open Tasks**
  related list on the *Related* tab, which does carry `status neq completed`.

The `sales/opportunities` page in all three doc languages is updated to match,
and three new guards pin the behaviour: rail entries must resolve to real objects
and relationship fields, must declare no literal title, and must declare no
filter — the last one so that an author reaching for the *Related* tab's
predicate gets a red test instead of a key that parses, ships and does nothing.
