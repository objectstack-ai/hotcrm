---
title: Metrics — What the Dashboards Count
description: What win rate, pipeline, quota attainment, coverage and the churn signals count, so a number on a dashboard can be checked rather than guessed.
order: 1
# sources: the analytics metadata this doc describes. Every definition below
# is pinned to it by test/docs-analytics-metrics.test.ts; build ignores
# unknown frontmatter keys.
sources:
  - dataset:opportunity_metrics
  - dataset:forecast_metrics
  - dataset:account_metrics
  - dataset:lead_metrics
  - dataset:event_metrics
  - dataset:task_metrics
  - report:customer_churn_signals
  - report:pipeline_coverage_by_quarter
---

# Metrics — What the Dashboards Count

For anyone who reads a dashboard and wants to know what a number means before
acting on it. The tiles show a name and a figure; this page says what each
figure counts, so two people looking at the same tile read it the same way.

Every figure reads only the records **you** are allowed to see. A manager who
reads every deal sees company totals; a rep sees their own.

## Deals and revenue

These figures count opportunities. "Open" always means a deal that is not yet
**Closed Won** or **Closed Lost**.

| Figure | What it counts |
|---|---|
| **Total Amount** | The sum of **Amount** over the deals in view. Pipeline tiles and won-revenue tiles are both this figure; what differs is which deals they keep. |
| **Avg Deal Size** | The average **Amount** over the deals in view. |
| **Avg Probability** | The average **Probability (%)**. Probability follows the stage, so this reads as how far along the deals are. |
| **Won Deals** | Deals at **Closed Won**. |
| **Lost Deals** | Deals at **Closed Lost**. |
| **Settled Deals** | Deals at **Closed Won** or **Closed Lost**: every deal that has an outcome. |
| **Won Revenue** | The **Amount** of deals at **Closed Won**. |
| **Lost Revenue** | The **Amount** of deals at **Closed Lost**. |
| **Win Rate** | **Won Deals** ÷ **Settled Deals**. Open deals are left out, so a busy pipeline does not drag the rate down. |

A table that shows **Win Rate** always shows **Won Deals** and **Lost Deals**
beside it, so you can check the arithmetic. A blank rate next to some lost
deals means no wins yet, which is 0%, not missing data.

The tiles apply these figures to a set of deals and a time window:

| Tile | What it counts |
|---|---|
| **Open Pipeline (Selected Period)** | **Total Amount** of the deals not at **Closed Won** or **Closed Lost**, for the period the date picker selects. |
| **Closed Won (QTD)** | **Total Amount** of the deals at **Closed Won** whose **Close Date** falls in the current quarter so far. |
| **Total Revenue (YTD)** | **Total Amount** of the deals at **Closed Won** whose **Close Date** falls in the current year so far. |
| **Win Rate (12M)** | **Win Rate** over the deals whose **Close Date** falls in the last 12 months. |
| **Deals Won (12M)** | **Won Deals** whose **Close Date** falls in the last 12 months. |
| **Deals Lost (12M)** | **Lost Deals** whose **Close Date** falls in the last 12 months. |

## Quota and attainment

Quota figures come from the **Forecasts** records: one per owner per period,
holding that owner's quota and what they have closed, committed and still have
in the pipeline.

| Figure | What it counts |
|---|---|
| **Quota** | The sum of **Quota** over the forecasts in view. |
| **Closed** | The sum of **Closed Won**: what the owners have already won. |
| **Pipeline** | The sum of **Pipeline**: the owners' open deals. |
| **Commit** | The sum of **Commit**: what the owners have committed to land. |
| **Attainment** | **Closed** ÷ **Quota**. The amounts are added up before dividing, so a large quota weighs more than a small one. |
| **Attainment %** | On one forecast record: **Closed Won** ÷ **Quota**. It reads 0% until a quota is set. |
| **Coverage Ratio** | On one forecast record: **Pipeline** ÷ (**Quota** − **Closed Won**), whether enough pipeline remains to cover what is still missing. It reads 0 once the quota is met. |
| **Quota Attainment by Rep** | **Quota**, **Closed** and **Attainment** per owner, from the **Quarter** forecasts of the current quarter only. It stays empty until the nightly forecast snapshot has opened the current quarter and a manager has set each quota. |

A period is always pinned. Adding a quarter's quota to a month's quota gives a
number that means nothing, so every quota figure either shows one period or
lists the periods side by side.

Under **Reports**, **Pipeline Coverage by Quarter** asks the same question for the whole
team:

| Report | What it counts |
|---|---|
| **Pipeline Coverage by Quarter** | **Total Amount** and **Opportunities** of the deals not at **Closed Won** or **Closed Lost**, by **Forecast Category** and **Close Quarter**. |

## Activity

| Figure | What it counts |
|---|---|
| **Activities** | Calls and meetings, one per event. |
| **Minutes** | The sum of **Duration (minutes)**. |
| **Interactions Logged** | **Activities** whose status is **Held**: contact that actually happened. |
| **Meetings Booked** | **Activities** of type **Meeting** whose status is **Planned**: meetings still ahead. |
| **Customer Minutes** | **Minutes** of the events whose status is **Held**. |
| **Tasks Completed** | **Tasks** whose **Is Completed** box is ticked. |

Why only held events count as contact is in [Activities](./crm_sales_activities.md).

## Accounts, leads and churn signals

| Figure | What it counts |
|---|---|
| **Active Accounts** | **Accounts** marked **Active**. |
| **Open Leads** | **Leads** that are not **Converted**. |
| **Quiet 30+ Days** | **Accounts** marked **Active** whose **Last Activity Date** is more than 30 days ago. |
| **Quiet 60+ Days** | **Accounts** marked **Active** whose **Last Activity Date** is more than 60 days ago. |
| **Quiet 90+ Days** | **Accounts** marked **Active** whose **Last Activity Date** is more than 90 days ago. |

**Customer Churn Signals**, under **Reports**, stacks four early warnings:

| Block | What it counts |
|---|---|
| **CSM-Flagged Accounts** | **Accounts** marked **Active** whose **Health Score** a person has set to **At Risk** or **Churning**. It has no time window: it is the one signal a person asserts rather than a date. |
| **At-Risk Accounts** | **Accounts** marked **Active** whose **Last Activity Date** is more than 60 days ago. |
| **Silent High-Value Accounts** | **Accounts** marked **Active**, with **Customer Tier** **Strategic** or **Enterprise**, whose **Last Activity Date** is more than 90 days ago. |
| **Recently Lost Opportunities** | **Total Amount** and **Opportunities** of the deals at **Closed Lost** whose **Close Date** falls in the last 30 days. |

The quiet and at-risk figures read **Last Activity Date**, which only a held
call or meeting moves. An account that is talked to every day is never quiet,
and one with only meetings booked for next quarter still is.

Case figures (SLA compliance, resolution time, knowledge deflection) are
explained with the cases themselves, in [Cases & SLAs](./crm_service_cases.md)
and [Knowledge](./crm_service_knowledge.md).
