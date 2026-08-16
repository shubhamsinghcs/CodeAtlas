export interface HotspotExplanation {
  factor: string;
  description: string;
}

export interface Hotspot {
  fileId: string;
  filePath: string;
  score: number; // 0 - 100
  severity: '⚠' | '🔥';
  explanations: HotspotExplanation[];
}
