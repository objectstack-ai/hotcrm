import type { Hook, HookContext } from '@objectstack/spec/data';

const ForecastCalculationTrigger: Hook = {
  name: 'ForecastCalculationTrigger',
  object: 'forecast',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    try {
      const amount = doc.amount || 0;
      const quota = doc.quota || 0;
      const managerAdjustment = doc.manager_adjustment || 0;

      // Calculate quota attainment percentage
      if (quota > 0) {
        doc.quota_attainment = (amount / quota) * 100;
      } else {
        doc.quota_attainment = 0;
      }

      // Calculate gap to quota
      doc.gap_to_quota = quota - amount;

      // Calculate adjusted amount
      doc.adjusted_amount = amount + managerAdjustment;

      // Set last calculated timestamp
      doc.last_calculated_at = new Date().toISOString();

      console.log(`📊 Forecast calculated: amount=${amount}, quota=${quota}, attainment=${doc.quota_attainment}%, gap=${doc.gap_to_quota}, adjusted=${doc.adjusted_amount}`);
    } catch (err) {
      console.error('❌ Forecast Calculation Error:', err);
    }
  }
};

const ForecastAggregationTrigger: Hook = {
  name: 'ForecastAggregationTrigger',
  object: 'forecast',
  events: ['afterInsert', 'afterUpdate'],
  handler: async (ctx: HookContext) => {
    const forecast = ctx.result as Record<string, any>;

    if (!forecast.owner_id || !forecast.forecast_period) return;

    try {
      const forecasts = await (ctx.ql as any).find('forecast', {
        filters: [
          ['owner_id', '=', forecast.owner_id],
          ['forecast_period', '=', forecast.forecast_period],
          ['period_start', '=', forecast.period_start]
        ]
      });

      if (!forecasts || forecasts.length === 0) return;

      let pipelineAmount = 0;
      let closedAmount = 0;

      for (const f of forecasts) {
        if (f.forecast_category === 'pipeline' || f.forecast_category === 'best_case' || f.forecast_category === 'commit') {
          pipelineAmount += f.amount || 0;
        }
        if (f.forecast_category === 'closed') {
          closedAmount += f.amount || 0;
        }
      }

      // Update all related forecasts with aggregated amounts (skip if unchanged to prevent recursive triggers)
      for (const f of forecasts) {
        if (f.pipeline_amount === pipelineAmount && f.closed_amount === closedAmount) continue;
        await (ctx.ql as any).doc.update('forecast', f._id, {
          pipeline_amount: pipelineAmount,
          closed_amount: closedAmount
        });
      }

      console.log(`📊 Forecast aggregation updated for owner ${forecast.owner_id}: pipeline=${pipelineAmount}, closed=${closedAmount}`);
    } catch (err) {
      console.error('❌ Forecast Aggregation Error:', err);
    }
  }
};

export { ForecastCalculationTrigger, ForecastAggregationTrigger };
export default [ForecastCalculationTrigger, ForecastAggregationTrigger] as Hook[];
