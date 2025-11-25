export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface SafetyCheckResult {
  safeToGenerate: boolean;
  riskLevel: RiskLevel;
  riskFlags: string[];
  reasoning?: string;
}
