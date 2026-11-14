// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook } from '@objectstack/spec/data';
import { createO2cRowStamp } from './_row-stamp';

/** The account stamp, from the step's contract — see `_row-stamp.ts`. */
const billingMilestoneRowStamp: Hook = createO2cRowStamp('crm_billing_milestone', 'billing_milestone_row_stamp');

export default [billingMilestoneRowStamp];
