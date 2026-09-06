---
'hotcrm': patch
---

Delete the three `crm_product` capabilities `docs/feature-inventory.md` credited the
catalog with and the source does not declare. QUO-010 listed `计费类型`
(`billing_type`), `计量单位` (`unit_of_measure`) and `库存` (inventory); QUO-012 listed a
「低库存(≤10)标红视图」. Every identifier behind those claims — `billing_type`,
`unit_of_measure`, `quantity_on_hand`, `reorder_point` — and the `low_stock` view they
fed were removed, and survive only as tombstone comments **in the very files those two
rows name as their anchors**: `src/objects/product.object.ts:109` and `:154`, and
`src/views/product.view.ts:11-15` (*"could not outlive them"*). Each row pointed a reader
at a source file that says, in prose, that the capability the row claims is gone.

Deleted rather than softened. The inventory *capability* was removed, not renamed — there
is no vaguer wording that would be true, and a row that keeps a capability class with no
implementation is the same defect one level up, harder to catch next time because it would
no longer name a specific missing field. The published product docs already say the same
thing outright: `content/docs/revenue/products.zh-Hans.mdx:52` is headed 「没有库存,也没有
计费周期」, so the internal inventory was contradicting the customer-facing page.

The surviving capability list was derived from the two anchor files at `df549fef`, not
copied from the card that filed this — this file is exactly the kind of hand-copied roster
the defect is about. `crm_product` declares **13** fields (`product_code`, `name`,
`display_title`, `description`, `category`, `family`, `list_price`, `cost`, `sku`,
`is_active`, `product_manager`, `image`, `datasheet`); QUO-010's every surviving clause
was re-checked against one of them — `PRD-{0000}` (`product_code.format`), tenant-unique
SKU (`sku.unique`, whose composite `(organization_id, sku)` the field comment explains),
`category` / `family`, pricing (`list_price` / `cost`, now named as such rather than
bundled into a 「定价与库存」 that was half false), `image` + PDF `datasheet`, and
`全组织可读` (`sharingModel: 'public_read'`). `ProductViews` defines exactly two list
views — the category-grouped `all_products` grid and the `product_catalog` gallery
covered by `image` — which is what QUO-012 now says.

Both rows stay. The file's own rule (line 10) keeps a numbered row and annotates it
「已移除」 when a *feature point* goes; neither feature point went — 产品目录对象 and
产品视图 both still exist, with fewer capabilities than the prose claimed — so no
annotation is due and the range reference 「产品:QUO-010~013」 at line 271 is untouched.
Nor is any count falsified: QUO-012 carries no numeral (unlike its LEA-014 / OPP-010 /
ACT-006 siblings, which do), and the overview's 「14 个视图文件」 counts *files*, of which
`src/views/product.view.ts` remains one.

Nothing about `crm_product.tax_rate` is touched, and this file carries no tax-rate row.
