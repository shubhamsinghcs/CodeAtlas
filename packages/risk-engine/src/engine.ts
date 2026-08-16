import {
  RiskWeightConfig,
  DEFAULT_RISK_CONFIG,
  FileMetrics,
  RiskEvaluation,
  RiskLevel,
} from './config';

export class RiskEngine {
  private config: RiskWeightConfig;

  constructor(config: Partial<RiskWeightConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  public evaluate(metrics: FileMetrics): RiskEvaluation {
    let score = 0;
    const reasons: string[] = [];

    // 1. Fan In
    if (metrics.fanIn > this.config.fanInThreshold) {
      score += this.config.fanInWeight;
      reasons.push(`high fan-in (${metrics.fanIn} dependents)`);
    } else if (metrics.fanIn > 0 && metrics.fanIn <= this.config.fanInThreshold) {
      // Partial penalty for some fan-in, optional, but let's stick to threshold based for determinism
    }

    // 2. Fan Out
    if (metrics.fanOut > this.config.fanOutThreshold) {
      score += this.config.fanOutWeight;
      reasons.push(`high fan-out (${metrics.fanOut} dependencies)`);
    }

    // 3. Depth
    if (metrics.depth > this.config.depthThreshold) {
      score += this.config.depthWeight;
      reasons.push(`deep dependency tree (depth ${metrics.depth})`);
    }

    // 4. File Size
    if (metrics.lines > this.config.fileSizeThreshold) {
      score += this.config.fileSizeWeight;
      reasons.push(`large file (${metrics.lines} lines)`);
    }

    // 5. Missing Tests
    if (!metrics.hasTests) {
      score += this.config.missingTestWeight;
      reasons.push('no related test');
    }

    // 6. Circular Dependencies
    if (metrics.hasCircularDependency) {
      score += this.config.circularDependencyWeight;
      reasons.push('circular dependency');
    }

    // Cap the score at 100
    score = Math.min(100, Math.max(0, score));

    return {
      score,
      level: this.getRiskLevel(score),
      reasons,
    };
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score < 40) return 'Low Risk';
    if (score < 70) return 'Medium Risk';
    return 'High Risk';
  }
}
