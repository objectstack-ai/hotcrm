import type { Hook, HookContext } from '@objectstack/spec/data';

import { createLogger } from '@hotcrm/core';
const logger = createLogger('analytics:metric');

/**
 * Metric Formula Validation
 *
 * Validates the formula syntax before a metric is created or updated.
 * Ensures only allowed tokens (field references, operators, functions) are used.
 */
const MetricFormulaValidation: Hook = {
 name: 'MetricFormulaValidation',
 object: 'metric',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (doc.formula == null) return;

 const formula = String(doc.formula).trim();
 if (formula.length === 0) {
 throw new Error('Validation Error: Formula cannot be empty');
 }

 // Reject dangerous patterns (code injection prevention)
 const forbiddenPatterns = [/import\s/i, /require\s*\(/i, /eval\s*\(/i, /Function\s*\(/i];
 for (const pattern of forbiddenPatterns) {
 if (pattern.test(formula)) {
 throw new Error('Validation Error: Formula contains forbidden expressions');
 }
 }

 // Validate balanced parentheses
 let depth = 0;
 for (const ch of formula) {
 if (ch === '(') depth++;
 if (ch === ')') depth--;
 if (depth < 0) {
 throw new Error('Validation Error: Formula has unbalanced parentheses');
 }
 }
 if (depth !== 0) {
 throw new Error('Validation Error: Formula has unbalanced parentheses');
 }

 // Validate allowed functions
 const allowedFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN', 'ABS', 'ROUND', 'IF', 'COALESCE'];
 const functionCalls = formula.match(/[A-Z_]+\s*\(/g) || [];
 for (const call of functionCalls) {
 const fnName = call.replace(/\s*\($/, '');
 if (!allowedFunctions.includes(fnName)) {
 throw new Error(`Validation Error: Unknown function "${fnName}" in formula. Allowed: ${allowedFunctions.join(', ')}`);
 }
 }
 }
};

/**
 * Metric Circular Dependency Check
 *
 * Before a calculated metric is saved, checks that its formula does not
 * reference itself or create a circular dependency chain.
 */
const MetricCircularDependency: Hook = {
 name: 'MetricCircularDependency',
 object: 'metric',
 events: ['beforeInsert', 'beforeUpdate'],
 handler: async (ctx: HookContext) => {
 const doc = ctx.input.doc as Record<string, any>;

 if (!doc.is_calculated || !doc.formula) return;

 const formula = String(doc.formula);

 // Extract metric references (pattern: ${metric_name})
 const refPattern = /\$\{([^}]+)\}/g;
 const references: string[] = [];
 let match: RegExpExecArray | null;
 while ((match = refPattern.exec(formula)) !== null) {
 references.push(match[1]);
 }

 if (references.length === 0) return;

 // Self-reference check
 const metricName = doc.name || (ctx.previous as Record<string, any>)?.name;
 if (metricName && references.includes(metricName)) {
 throw new Error(`Validation Error: Metric "${metricName}" cannot reference itself`);
 }

 // Walk the dependency graph to detect cycles
 const visited = new Set<string>([metricName]);
 const queue = [...references];

 while (queue.length > 0) {
 const ref = queue.shift()!;
 if (visited.has(ref)) {
 throw new Error(`Validation Error: Circular dependency detected involving metric "${ref}"`);
 }
 visited.add(ref);

 try {
 const depMetrics = await (ctx.ql as any).find('metric', {
 filters: [['name', '=', ref]],
 limit: 1
 });
 if (depMetrics.length > 0 && depMetrics[0].formula) {
 const depFormula = String(depMetrics[0].formula);
 let depMatch: RegExpExecArray | null;
 const depRefPattern = /\$\{([^}]+)\}/g;
 while ((depMatch = depRefPattern.exec(depFormula)) !== null) {
 queue.push(depMatch[1]);
 }
 }
 } catch {
 // If we can't resolve the reference, skip cycle check for it
 }
 }
 }
};

/**
 * Metric Aggregation Computation
 *
 * After a new metric is inserted, computes the initial aggregation value
 * based on source_object and aggregation_type.
 */
const MetricAggregationComputation: Hook = {
 name: 'MetricAggregationComputation',
 object: 'metric',
 events: ['afterInsert'],
 handler: async (ctx: HookContext) => {
 const metric = ctx.result as Record<string, any>;
 if (!metric?._id || !metric.source_object || !metric.aggregation_type) return;

 logger.info(`Computing initial aggregation for metric "${metric.name}"`);

 try {
 let filters: Array<[string, string, any]> = [];
 if (metric.filters) {
 const parsed = typeof metric.filters === 'string' ? JSON.parse(metric.filters) : metric.filters;
 if (Array.isArray(parsed)) {
 filters = parsed;
 }
 }

 const records = await (ctx.ql as any).find(metric.source_object, { filters });

 if (records.length === 0) return;

 const fieldName = metric.formula?.trim() || '_id';
 const values = records
 .map((r: Record<string, any>) => Number(r[fieldName]))
 .filter((v: number) => !isNaN(v));

 let result: number | null = null;
 switch (metric.aggregation_type) {
 case 'count':
 result = records.length;
 break;
 case 'sum':
 result = values.reduce((a: number, b: number) => a + b, 0);
 break;
 case 'avg':
 result = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
 break;
 case 'min':
 result = values.length > 0 ? Math.min(...values) : 0;
 break;
 case 'max':
 result = values.length > 0 ? Math.max(...values) : 0;
 break;
 case 'median': {
 if (values.length === 0) { result = 0; break; }
 const sorted = [...values].sort((a: number, b: number) => a - b);
 const mid = Math.floor(sorted.length / 2);
 result = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
 break;
 }
 default:
 result = records.length;
 }

 if (result != null) {
 await (ctx.ql as any).doc.update('metric', metric._id, {
 description: `${metric.description || ''}\n[Initial value: ${result}]`.trim()
 });
 logger.info(`Metric "${metric.name}" initial aggregation: ${result}`);
 }
 } catch (error) {
 logger.warn('Failed to compute initial metric aggregation:', error);
 }
 }
};

export { MetricFormulaValidation, MetricCircularDependency, MetricAggregationComputation };
export default MetricFormulaValidation;
