/**
 * Performance Benchmarking Utilities
 *
 * Provides tools for measuring and comparing the execution performance
 * of HotCRM's critical paths: hooks, actions, workflows, and AI predictions.
 *
 * Usage:
 * const bench = new Benchmark('lead_scoring');
 * const result = await bench.run(() => scoreLead(lead), { iterations: 100 });
 * logger.info(result.summary());
 */

import { createLogger } from '@hotcrm/core';
const logger = createLogger('ai:benchmark');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenchmarkOptions {
 /** Number of iterations (default: 100) */
 iterations?: number;
 /** Warm-up iterations before measurement (default: 5) */
 warmup?: number;
 /** Timeout per iteration in ms (default: 30000) */
 timeout?: number;
}

export interface BenchmarkResult {
 /** Benchmark name */
 name: string;
 /** Total iterations executed */
 iterations: number;
 /** Total elapsed time in ms */
 totalMs: number;
 /** Average time per iteration in ms */
 meanMs: number;
 /** Median time per iteration in ms */
 medianMs: number;
 /** 95th percentile latency in ms */
 p95Ms: number;
 /** 99th percentile latency in ms */
 p99Ms: number;
 /** Minimum iteration time in ms */
 minMs: number;
 /** Maximum iteration time in ms */
 maxMs: number;
 /** Operations per second */
 opsPerSecond: number;
 /** Standard deviation in ms */
 stdDevMs: number;
 /** Individual iteration timings in ms */
 timings: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
 if (sorted.length === 0) return 0;
 const idx = Math.ceil((p / 100) * sorted.length) - 1;
 return sorted[Math.max(0, idx)];
}

function stdDev(values: number[], mean: number): number {
 if (values.length <= 1) return 0;
 const squaredDiffs = values.map(v => (v - mean) ** 2);
 return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

// ---------------------------------------------------------------------------
// Benchmark Class
// ---------------------------------------------------------------------------

export class Benchmark {
 private readonly name: string;

 constructor(name: string) {
 this.name = name;
 }

 /**
 * Run a synchronous or asynchronous function and collect timing data.
 */
 async run(
 fn: () => unknown | Promise<unknown>,
 options?: BenchmarkOptions,
 ): Promise<BenchmarkResult> {
 const iterations = options?.iterations ?? 100;
 const warmup = options?.warmup ?? 5;
 const timeout = options?.timeout ?? 30_000;

 // Warm-up phase
 for (let i = 0; i < warmup; i++) {
 await Promise.resolve(fn());
 }

 // Measurement phase
 const timings: number[] = [];
 const start = performance.now();

 for (let i = 0; i < iterations; i++) {
 const iterStart = performance.now();
 await Promise.resolve(fn());
 const iterEnd = performance.now();
 timings.push(iterEnd - iterStart);

 if (iterEnd - start > timeout) {
 break;
 }
 }

 const totalMs = performance.now() - start;
 const sorted = [...timings].sort((a, b) => a - b);
 const mean = timings.reduce((a, b) => a + b, 0) / timings.length;

 return {
 name: this.name,
 iterations: timings.length,
 totalMs,
 meanMs: mean,
 medianMs: percentile(sorted, 50),
 p95Ms: percentile(sorted, 95),
 p99Ms: percentile(sorted, 99),
 minMs: sorted[0] ?? 0,
 maxMs: sorted[sorted.length - 1] ?? 0,
 opsPerSecond: timings.length / (totalMs / 1000),
 stdDevMs: stdDev(timings, mean),
 timings,
 };
 }
}

// ---------------------------------------------------------------------------
// Suite (run multiple benchmarks)
// ---------------------------------------------------------------------------

export interface BenchmarkSuiteEntry {
 name: string;
 fn: () => unknown | Promise<unknown>;
 options?: BenchmarkOptions;
}

export class BenchmarkSuite {
 private readonly entries: BenchmarkSuiteEntry[] = [];

 add(name: string, fn: () => unknown | Promise<unknown>, options?: BenchmarkOptions): this {
 this.entries.push({ name, fn, options });
 return this;
 }

 async run(): Promise<BenchmarkResult[]> {
 const results: BenchmarkResult[] = [];
 for (const entry of this.entries) {
 const bench = new Benchmark(entry.name);
 results.push(await bench.run(entry.fn, entry.options));
 }
 return results;
 }
}

// ---------------------------------------------------------------------------
// Formatting Helper
// ---------------------------------------------------------------------------

/**
 * Format benchmark results as a human-readable table string.
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
 const header = '| Benchmark | Ops/s | Mean (ms) | Median (ms) | P95 (ms) | P99 (ms) | Std Dev |';
 const sep = '|-----------|-------|-----------|-------------|----------|----------|---------|';
 const rows = results.map(r =>
 `| ${r.name} | ${r.opsPerSecond.toFixed(0)} | ${r.meanMs.toFixed(2)} | ${r.medianMs.toFixed(2)} | ${r.p95Ms.toFixed(2)} | ${r.p99Ms.toFixed(2)} | ${r.stdDevMs.toFixed(2)} |`
 );
 return [header, sep, ...rows].join('\n');
}
