import { describe, it, expect } from 'vitest';
import { RiskEngine } from './engine';
import { FileMetrics } from './config';

describe('RiskEngine', () => {
  const defaultMetrics: FileMetrics = {
    fanIn: 0,
    fanOut: 0,
    depth: 1,
    lines: 100,
    hasTests: true,
    hasCircularDependency: false,
  };

  it('scores a perfect file as 0 (Low Risk)', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate(defaultMetrics);

    expect(result.score).toBe(0);
    expect(result.level).toBe('Low Risk');
    expect(result.factors).toHaveLength(0);
  });

  it('adds points for missing tests', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, hasTests: false });

    expect(result.score).toBe(20);
    expect(result.level).toBe('Low Risk');
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'Missing tests', contribution: 20 }));
  });

  it('adds points for high fan-in', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, fanIn: 15 });

    expect(result.score).toBe(10);
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'High fan-in', contribution: 10 }));
  });

  it('adds points for high fan-out', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, fanOut: 8 });

    expect(result.score).toBe(15);
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'High fan-out', contribution: 15 }));
  });

  it('adds points for large files', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, lines: 400 });

    expect(result.score).toBe(20);
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'Large file', contribution: 20 }));
  });

  it('adds points for circular dependencies', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, hasCircularDependency: true });

    expect(result.score).toBe(20);
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'Circular dependency', contribution: 20 }));
  });

  it('adds points for deep dependency tree', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({ ...defaultMetrics, depth: 6 });

    expect(result.score).toBe(15);
    expect(result.factors).toContainEqual(expect.objectContaining({ name: 'Dependency depth', contribution: 15 }));
  });

  it('correctly categorizes High Risk and caps at 100', () => {
    const engine = new RiskEngine();
    const result = engine.evaluate({
      fanIn: 20, // +10
      fanOut: 20, // +15
      depth: 10, // +15
      lines: 1000, // +20
      hasTests: false, // +20
      hasCircularDependency: true, // +20
    });

    // Total sum = 100, wait 10+15+15+20+20+20 = 100 exactly.
    expect(result.score).toBe(100);
    expect(result.level).toBe('High Risk');
    expect(result.factors).toHaveLength(6);
  });

  it('caps the score strictly at 100', () => {
    const engine = new RiskEngine({ circularDependencyWeight: 50 }); // Override config to test overflow
    const result = engine.evaluate({
      fanIn: 20, // +10
      fanOut: 20, // +15
      depth: 10, // +15
      lines: 1000, // +20
      hasTests: false, // +20
      hasCircularDependency: true, // +50
    });

    // Total sum = 130 -> capped to 100
    expect(result.score).toBe(100);
    expect(result.level).toBe('High Risk');
  });

  it('checks label boundaries correctly', () => {
    // Exactly 39 -> Low Risk
    const engine39 = new RiskEngine({ fileSizeWeight: 39 });
    const res39 = engine39.evaluate({ ...defaultMetrics, lines: 400 });
    expect(res39.score).toBe(39);
    expect(res39.level).toBe('Low Risk');

    // Exactly 40 -> Medium Risk
    const engine40 = new RiskEngine({ fileSizeWeight: 40 });
    const res40 = engine40.evaluate({ ...defaultMetrics, lines: 400 });
    expect(res40.score).toBe(40);
    expect(res40.level).toBe('Medium Risk');

    // Exactly 69 -> Medium Risk
    const engine69 = new RiskEngine({ fileSizeWeight: 69 });
    const res69 = engine69.evaluate({ ...defaultMetrics, lines: 400 });
    expect(res69.score).toBe(69);
    expect(res69.level).toBe('Medium Risk');

    // Exactly 70 -> High Risk
    const engine70 = new RiskEngine({ fileSizeWeight: 70 });
    const res70 = engine70.evaluate({ ...defaultMetrics, lines: 400 });
    expect(res70.score).toBe(70);
    expect(res70.level).toBe('High Risk');
  });
});
