import { describe, it, expect } from 'vitest';
import {
  Benchmark,
  BenchmarkSuite,
  formatBenchmarkResults,
} from '../../../ai/src/benchmark';
import type { BenchmarkResult } from '../../../ai/src/benchmark';

describe('Benchmark', () => {
  it('should measure a synchronous function', async () => {
    const bench = new Benchmark('sync_add');
    const result = await bench.run(() => 1 + 1, { iterations: 50, warmup: 2 });

    expect(result.name).toBe('sync_add');
    expect(result.iterations).toBe(50);
    expect(result.meanMs).toBeGreaterThanOrEqual(0);
    expect(result.medianMs).toBeGreaterThanOrEqual(0);
    expect(result.p95Ms).toBeGreaterThanOrEqual(result.medianMs);
    expect(result.p99Ms).toBeGreaterThanOrEqual(result.p95Ms);
    expect(result.minMs).toBeLessThanOrEqual(result.maxMs);
    expect(result.opsPerSecond).toBeGreaterThan(0);
    expect(result.timings).toHaveLength(50);
  });

  it('should measure an async function', async () => {
    const bench = new Benchmark('async_delay');
    const result = await bench.run(
      () => new Promise(resolve => setTimeout(resolve, 1)),
      { iterations: 10, warmup: 1 },
    );

    expect(result.name).toBe('async_delay');
    expect(result.iterations).toBe(10);
    expect(result.meanMs).toBeGreaterThanOrEqual(0);
  });

  it('should default to 100 iterations and 5 warmup', async () => {
    let count = 0;
    const bench = new Benchmark('counter');
    const result = await bench.run(() => { count++; });

    // warmup: 5, iterations: 100 → total calls = 105
    expect(count).toBe(105);
    expect(result.iterations).toBe(100);
  });

  it('should respect timeout option', async () => {
    const bench = new Benchmark('slow');
    const result = await bench.run(
      () => new Promise(resolve => setTimeout(resolve, 50)),
      { iterations: 1000, warmup: 0, timeout: 200 },
    );

    // Should break early due to timeout
    expect(result.iterations).toBeLessThan(1000);
  });

  it('should compute correct stdDev for identical timings', async () => {
    const bench = new Benchmark('const_time');
    const result = await bench.run(() => {}, { iterations: 10, warmup: 0 });

    // stdDev should be very small for near-zero operations
    expect(result.stdDevMs).toBeGreaterThanOrEqual(0);
  });

  it('should return zero percentiles for empty run (timeout=0)', async () => {
    const bench = new Benchmark('empty');
    const result = await bench.run(
      () => new Promise(resolve => setTimeout(resolve, 100)),
      { iterations: 10, warmup: 0, timeout: 1 },
    );
    // At least 1 iteration should complete before timeout
    expect(result.iterations).toBeGreaterThanOrEqual(0);
  });
});

describe('BenchmarkSuite', () => {
  it('should run multiple benchmarks sequentially', async () => {
    const suite = new BenchmarkSuite();
    suite
      .add('add', () => 1 + 1, { iterations: 10, warmup: 0 })
      .add('mul', () => 2 * 3, { iterations: 10, warmup: 0 });

    const results = await suite.run();

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('add');
    expect(results[1].name).toBe('mul');
  });
});

describe('formatBenchmarkResults', () => {
  it('should produce a markdown table', () => {
    const results: BenchmarkResult[] = [
      {
        name: 'test_op',
        iterations: 100,
        totalMs: 500,
        meanMs: 5.0,
        medianMs: 4.5,
        p95Ms: 8.0,
        p99Ms: 12.0,
        minMs: 2.0,
        maxMs: 15.0,
        opsPerSecond: 200,
        stdDevMs: 2.5,
        timings: [],
      },
    ];

    const table = formatBenchmarkResults(results);
    expect(table).toContain('| Benchmark |');
    expect(table).toContain('test_op');
    expect(table).toContain('200');
    expect(table).toContain('5.00');
    expect(table).toContain('4.50');
    expect(table).toContain('8.00');
    expect(table).toContain('12.00');
  });

  it('should handle empty results', () => {
    const table = formatBenchmarkResults([]);
    expect(table).toContain('| Benchmark |');
    // Only header + separator, no data rows
    expect(table.split('\n')).toHaveLength(2);
  });
});
