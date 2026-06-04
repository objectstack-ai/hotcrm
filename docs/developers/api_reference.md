# HotCRM Object Reference

> Current object and field reference for the single-app HotCRM repository.

Object definitions live in `src/objects/*.object.ts`. All business object names use the `crm_` prefix.

## Sales

### `crm_account` - Account

Source: `src/objects/account.object.ts`

Key fields:

`account_number`, `name`, `type`, `industry`, `annual_revenue`, `number_of_employees`, `phone`, `website`, `billing_address`, `office_location`, `owner`, `parent_account`, `is_active`, `tier`, `segment`, `health_score`, `renewal_owner`, `next_renewal_date`

### `crm_contact` - Contact

Source: `src/objects/contact.object.ts`

Key fields:

`salutation`, `first_name`, `last_name`, `full_name`, `avatar`, `crm_account`, `title`, `department`, `reports_to`, `owner`, `email`, `phone`, `mobile`, `mailing_street`, `mailing_city`, `mailing_state`, `mailing_postal_code`, `mailing_country`, `birthdate`, `lead_source`, `is_primary`, `do_not_call`, `email_opt_out`

### `crm_lead` - Lead

Source: `src/objects/lead.object.ts`

Key fields:

`salutation`, `first_name`, `last_name`, `full_name`, `company`, `title`, `industry`, `email`, `phone`, `mobile`, `website`, `status`, `rating`, `lead_source`, `owner`, `is_converted`, `converted_account`, `converted_contact`, `converted_opportunity`, `converted_date`, `address`, `annual_revenue`, `number_of_employees`, `do_not_call`, `email_opt_out`, `next_followup_date`, `last_contacted_date`, `disqualification_reason`

### `crm_opportunity` - Opportunity

Source: `src/objects/opportunity.object.ts`

Key fields:

`name`, `crm_account`, `primary_contact`, `owner`, `amount`, `expected_revenue`, `stage`, `probability`, `close_date`, `created_date`, `type`, `lead_source`, `competitors`, `crm_campaign`, `days_in_stage`, `next_step`, `is_private`, `forecast_category`, `approval_status`, `approved_date`, `win_reason`, `loss_reason`, `loss_details`

### `crm_opportunity_line_item` - Opportunity Line Item

Source: `src/objects/opportunity_line_item.object.ts`

Key fields:

`crm_opportunity`, `crm_product`, `description`, `quantity`, `list_price`, `unit_price`, `discount`, `total_price`, `line_number`

### `crm_forecast` - Forecast

Source: `src/objects/forecast.object.ts`

Key fields:

`owner`, `period`, `period_start`, `period_end`, `period_label`, `snapshot_date`, `quota`, `pipeline_amount`, `best_case_amount`, `commit_amount`, `closed_amount`, `expected_amount`, `attainment_pct`, `coverage_ratio`, `source`, `notes`

## Service

### `crm_case` - Case

Source: `src/objects/case.object.ts`

Key fields:

`case_number`, `subject`, `description`, `crm_account`, `crm_contact`, `status`, `priority`, `type`, `origin`, `owner`, `created_date`, `closed_date`, `first_response_date`, `resolution_time_hours`, `sla_due_date`, `is_sla_violated`, `is_escalated`, `escalated_date`, `escalation_reason`, `parent_case`, `resolution`, `customer_rating`, `customer_feedback`, `customer_signature`, `internal_notes`, `is_closed`

### `crm_knowledge_article` - Knowledge Article

Source: `src/objects/knowledge_article.object.ts`

Key fields:

`article_number`, `title`, `summary`, `body`, `category`, `tags`, `status`, `audience`, `language`, `related_to_case`, `owner`, `published_at`, `last_reviewed_at`, `view_count`, `helpful_count`, `not_helpful_count`

### `crm_task` - Task

Source: `src/objects/task.object.ts`

Key fields:

`subject`, `description`, `status`, `priority`, `type`, `due_date`, `reminder_date`, `completed_date`, `owner`, `related_to_type`, `related_to_account`, `related_to_contact`, `related_to_opportunity`, `related_to_lead`, `related_to_case`, `is_recurring`, `recurrence_type`, `recurrence_interval`, `recurrence_end_date`, `is_completed`, `is_overdue`, `progress_percent`, `estimated_hours`, `actual_hours`

## Marketing

### `crm_campaign` - Campaign

Source: `src/objects/campaign.object.ts`

Key fields:

`campaign_code`, `name`, `description`, `type`, `channel`, `status`, `start_date`, `end_date`, `budgeted_cost`, `actual_cost`, `expected_revenue`, `actual_revenue`, `target_size`, `num_sent`, `num_responses`, `num_leads`, `num_converted_leads`, `num_opportunities`, `num_won_opportunities`, `response_rate`, `roi`, `parent_campaign`, `owner`, `landing_page_url`, `is_active`

### `crm_campaign_member` - Campaign Member

Source: `src/objects/campaign_member.object.ts`

Key fields:

`crm_campaign`, `crm_lead`, `crm_contact`, `status`, `added_date`, `first_opened_date`, `first_clicked_date`, `response_date`, `has_responded`

## Revenue

### `crm_product` - Product

Source: `src/objects/product.object.ts`

Key fields:

`product_code`, `name`, `description`, `category`, `family`, `list_price`, `cost`, `sku`, `quantity_on_hand`, `reorder_point`, `is_active`, `is_taxable`, `product_manager`, `image`, `datasheet`, `tax_rate`, `billing_type`, `unit_of_measure`

### `crm_quote` - Quote

Source: `src/objects/quote.object.ts`

Key fields:

`quote_number`, `name`, `crm_account`, `crm_contact`, `crm_opportunity`, `owner`, `status`, `quote_date`, `expiration_date`, `subtotal`, `discount`, `discount_amount`, `tax`, `shipping_handling`, `total_price`, `payment_terms`, `shipping_terms`, `billing_address`, `shipping_address`, `description`, `internal_notes`

### `crm_quote_line_item` - Quote Line Item

Source: `src/objects/quote_line_item.object.ts`

Key fields:

`crm_quote`, `crm_product`, `description`, `quantity`, `list_price`, `unit_price`, `discount`, `subtotal`, `tax_rate`, `total_price`, `line_number`

### `crm_contract` - Contract

Source: `src/objects/contract.object.ts`

Key fields:

`contract_number`, `crm_account`, `crm_contact`, `crm_opportunity`, `owner`, `status`, `contract_term_months`, `start_date`, `end_date`, `contract_value`, `billing_frequency`, `payment_terms`, `auto_renewal`, `renewal_notice_days`, `contract_type`, `signed_date`, `signed_by`, `document_url`, `special_terms`, `billing_address`

## Verification

Regenerate confidence after object changes with:

```bash
pnpm validate
pnpm typecheck
```

`pnpm validate` is authoritative for object count and field count.
