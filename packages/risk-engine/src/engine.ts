import {
  RiskWeightConfig,
  DEFAULT_RISK_CONFIG,
  FileMetrics,
  RiskEvaluation,
  RiskLevel,
  RiskFactor,
} from './config';

export class RiskEngine {
  private config: RiskWeightConfig;

  constructor(config: Partial<RiskWeightConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  public evaluate(metrics: FileMetrics): RiskEvaluation {
    let score = 0;
    const factors: RiskFactor[] = [];

    // 1. Fan In
    if (metrics.fanIn > this.config.fanInThreshold) {
      score += this.config.fanInWeight;
      factors.push({
        name: 'High fan-in',
        description: `${metrics.fanIn} files depend on it.`,
        contribution: this.config.fanInWeight
      });
    }

    // 2. Fan Out
    if (metrics.fanOut > this.config.fanOutThreshold) {
      score += this.config.fanOutWeight;
      factors.push({
        name: 'High fan-out',
        description: `It imports ${metrics.fanOut} modules.`,
        contribution: this.config.fanOutWeight
      });
    }

    // 3. Depth
    if (metrics.depth > this.config.depthThreshold) {
      score += this.config.depthWeight;
      factors.push({
        name: 'Dependency depth',
        description: `It sits ${metrics.depth} levels deep in the dependency graph.`,
        contribution: this.config.depthWeight
      });
    }

    // 4. File Size
    if (metrics.lines > this.config.fileSizeThreshold) {
      score += this.config.fileSizeWeight;
      factors.push({
        name: 'Large file',
        description: `File has ${metrics.lines} lines.`,
        contribution: this.config.fileSizeWeight
      });
    }

    // 5. Missing Tests
    if (!metrics.hasTests) {
      score += this.config.missingTestWeight;
      factors.push({
        name: 'Missing tests',
        description: `No nearby tests were detected.`,
        contribution: this.config.missingTestWeight
      });
    }

    // 6. Circular Dependencies
    if (metrics.hasCircularDependency) {
      score += this.config.circularDependencyWeight;
      factors.push({
        name: 'Circular dependency',
        description: `Involved in a dependency cycle.`,
        contribution: this.config.circularDependencyWeight
      });
    }

    // 7. Git Churn
    if (metrics.git && metrics.git.churn === 'HIGH') {
      score += this.config.highChurnWeight;
      factors.push({
        name: 'High churn',
        description: `File has been modified ${metrics.git.recentModifications} times recently.`,
        contribution: this.config.highChurnWeight
      });
    }

    // Cap the score at 100
    score = Math.min(100, Math.max(0, score));

    return {
      score,
      level: this.getRiskLevel(score),
      factors,
    };
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score < 40) return 'Low Risk';
    if (score < 70) return 'Medium Risk';
    return 'High Risk';
  }
}
