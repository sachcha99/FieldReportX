import {
  computeSmoothnessScore,
  computeAngleDelta,
} from '../src/services/sensorService';

describe('computeSmoothnessScore', () => {
  it('returns null for empty samples', () => {
    expect(computeSmoothnessScore([])).toBeNull();
  });

  it('returns null for a single sample', () => {
    expect(computeSmoothnessScore([{ x: 0, y: 0, z: 1 }])).toBeNull();
  });

  it('returns 100 for perfectly steady samples (no variance)', () => {
    const samples = Array(10).fill({ x: 0, y: 0, z: 1 });
    const score = computeSmoothnessScore(samples);
    expect(score).toBe(100);
  });

  it('returns a lower score for highly variable samples', () => {
    // Magnitudes differ significantly: ~1.7, ~8.7, ~1.0, ~10.4 — high variance
    const volatile = [
      { x: 1, y: 1, z: 0.2 },
      { x: 5, y: 6, z: 3 },
      { x: 0, y: 1, z: 0 },
      { x: 6, y: 8, z: 0 },
    ];
    const score = computeSmoothnessScore(volatile);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(100);
  });

  it('returns a score between 0 and 100', () => {
    const samples = [
      { x: 0.1, y: 0.2, z: 0.9 },
      { x: 0.2, y: 0.1, z: 1.0 },
      { x: 0.3, y: 0.3, z: 0.8 },
    ];
    const score = computeSmoothnessScore(samples);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('computeAngleDelta', () => {
  it('returns 0 for empty samples', () => {
    expect(computeAngleDelta([])).toBe(0);
  });

  it('accumulates absolute rotation values', () => {
    const samples = [{ x: 1 }, { x: 1 }, { x: 1 }];
    const result = computeAngleDelta(samples, 'x', 1000);
    expect(result).toBeGreaterThan(0);
  });

  it('returns a non-negative number', () => {
    const samples = [{ x: -2, y: 1, z: 0.5 }];
    expect(computeAngleDelta(samples, 'x', 200)).toBeGreaterThanOrEqual(0);
  });
});
