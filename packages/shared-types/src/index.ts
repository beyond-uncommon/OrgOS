export type {
  User,
  Department,
  DailyEntry,
  ExtractedMetric,
  WeeklyReport,
  MonthlyReport,
  Alert,
  Intervention,
  DashboardSnapshot,
} from "@orgos/db";

export {
  Role,
  EntryStatus,
  MetricSource,
  ReportStatus,
  AlertType,
  Severity,
  InterventionStatus,
  SnapshotScope,
  PeriodType,
  PendingActionStatus,
  ActionExecutionMode as ActionExecutionModeEnum,
} from "@orgos/db";

// ─── Canonical Metric Keys ────────────────────────────────────────────────────

export type MetricKey =
  | "attendance_rate"
  | "dropout_count"
  | "engagement_score"
  | "output_count"
  | "blocker_present"
  | "risk_flag";

export type EngagementScore = "LOW" | "MEDIUM" | "HIGH";

export type ExtractedMetricValue = number | boolean | EngagementScore;

// ─── Trend Contract (set by intelligence layer, rendered by UI) ───────────────

/**
 * The UI imports this type — never the service implementation.
 * impact is always resolved by metricSemantics.ts, never by frontend code.
 */
export interface ResolvedTrend {
  direction: "up" | "down" | "neutral";
  impact: "positive" | "negative";
}

// ─── Anomaly System ───────────────────────────────────────────────────────────

/**
 * Internal anomaly classification — distinct from AlertType.
 * AnomalyType describes what the detector found.
 * AlertType describes what was persisted to the DB.
 */
export type AnomalyType =
  | "SPIKE"
  | "GAP"
  | "INCONSISTENCY"
  | "MISSING_ENTRY";

/**
 * Written once to Alert.metadata at alert creation time.
 * Never updated after creation. Used for auditability and idempotency.
 */
export interface AnomalyMetadata {
  anomalyId: string;    // sha256(type + entryId + metricKey + detectionWindow)
  ruleVersion: string;  // e.g. "anomaly-rules-v1"
}

/**
 * Pure data returned by detectors.
 * No DB references. Fully serializable.
 * Converted to Alert by the Alert Factory — never directly persisted.
 */
export interface AnomalyResult {
  anomalyType: AnomalyType;
  metricKey?: MetricKey;
  entryId?: string;
  userId?: string;
  departmentId: string;
  description: string;
  detectedAt: Date;
  detectionWindow?: string;   // e.g. "14d" — included in anomalyId hash
  consecutiveDays?: number;   // for MISSING_ENTRY severity escalation
}

// ─── Insight Engine ───────────────────────────────────────────────────────────

export type InsightType = "WEEKLY" | "MONTHLY" | "EXECUTIVE";

export type InsightPatternType = "TREND" | "RISK_CLUSTER" | "BEHAVIOR_SHIFT";

export type RiskCategory =
  | "OPERATIONAL"
  | "ENGAGEMENT"
  | "PERFORMANCE"
  | "DATA_QUALITY";

export interface InsightContext {
  departmentId: string;
  timeWindow: { from: Date; to: Date };
  anomalies: AnomalyResult[];
  alerts: { id: string; type: string; severity: string; createdAt: Date }[];
  metrics: { metricKey: string; metricValue: unknown; extractedAt: Date; userId: string }[];
}

export interface InsightPattern {
  type: InsightPatternType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  evidence: AnomalyResult[];
}

export interface InsightCorrelation {
  cause: string;
  effect: string;
  confidence: number;             // 0–1
  supportingAnomalies: AnomalyResult[];
}

export interface RiskSignal {
  category: RiskCategory;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  evidence: AnomalyResult[];
}

export interface InsightReport {
  type: InsightType;
  departmentId: string;
  summary: string;
  insights: InsightPattern[];
  correlations: InsightCorrelation[];
  risks: RiskSignal[];
  recommendations: string[];
  confidence: number;             // 0–1, aggregate
  generatedAt: Date;
  promptVersion?: string;
  forecast?: InsightForecast;     // populated by v2 layer when available
}

// ─── Insight Engine v2 — Predictive Layer ─────────────────────────────────────

export type ForecastHorizon = "7D" | "14D" | "30D";

export type ForecastDirection = "UP" | "DOWN" | "STABLE";

export interface ForecastedTrend {
  metricKey: string;
  direction: ForecastDirection;
  confidence: number;
  projectedValue7Days: number;
  projectedValue30Days: number;
  /** 0–1 — high volatility lowers confidence */
  volatilityDamping: number;
}

export interface RecurrenceRisk {
  anomalyType: AnomalyType;
  metricKey?: MetricKey;
  probabilityNext7Days: number;   // 0–1
  probabilityNext30Days: number;  // 0–1
  historicalFrequency: number;    // occurrences per 30 days in history
}

export interface RiskEscalationForecast {
  riskCategory: RiskCategory;
  currentSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  horizon: ForecastHorizon;
  triggerConditions: string[];
  confidence: number;
}

export interface ForwardRiskSignal {
  category: RiskCategory;
  likelihood: number;           // 0–1
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timeToManifest: ForecastHorizon;
  confidence: number;
  description: string;
}

export type OpportunityType =
  | "ENGAGEMENT_IMPROVEMENT"
  | "DROPOUT_REDUCTION"
  | "METRIC_STABILITY"
  | "SCALING_READINESS"
  | "PROCESS_OPTIMIZATION";

export interface OpportunitySignal {
  type: OpportunityType;
  metricKey?: string;
  description: string;
  expectedBenefit: string;
  confidence: number;
}

export interface InsightForecast {
  departmentId: string;
  summary: string;
  forecastedTrends: ForecastedTrend[];
  recurrenceRisks: RecurrenceRisk[];
  escalationForecasts: RiskEscalationForecast[];
  forwardRisks: ForwardRiskSignal[];
  opportunities: OpportunitySignal[];
  recommendedPreemptiveActions: string[];
  confidence: number;
  generatedAt: Date;
  promptVersion?: string;
}

// ─── Insight Engine v3 — Autonomous Action Layer ─────────────────────────────

export type DecisionType = "INTERVENE" | "MONITOR" | "ESCALATE" | "IGNORE";

export type ActionExecutionMode = "AUTO" | "HUMAN_APPROVAL" | "SYSTEM";

export type ActionUrgency = "IMMEDIATE" | "24H" | "7D";

/** Priority: 0 = P0 (critical/immediate), 3 = P3 (opportunity) */
export type ActionPriority = 0 | 1 | 2 | 3;

export interface DecisionSignal {
  type: DecisionType;
  confidence: number;
  rationale: string;
  /** The forward risk or opportunity that triggered this decision */
  sourceSignal: ForwardRiskSignal | OpportunitySignal;
}

export interface ActionPlan {
  actionType: string;
  target: string;               // departmentId, userId, or metricKey depending on actionType
  priority: ActionPriority;
  urgency: ActionUrgency;
  executionMode: ActionExecutionMode;
  rationale: string;
  payload: Record<string, unknown>;
  forecastRunId: string;
  departmentId: string;
  expiresAt: Date;
}

export interface PredictionAccuracyScore {
  forecastRunId: string;
  metricKey: string;
  horizon: ForecastHorizon;
  predictedValue: number;
  actualValue: number;
  /** Absolute percentage error: |actual - predicted| / |actual| */
  absPercentError: number;
  /** Signed drift: actual - predicted (positive = under-predicted) */
  drift: number;
}

// ─── Governance Layer ─────────────────────────────────────────────────────────

/** Mirrors the Role enum from Prisma but extended with SYSTEM and BOARD */
export type OrgNode =
  | "BOARD"
  | "EXECUTIVE"
  | "DEPARTMENT_HEAD"
  | "PROGRAM_LEAD"
  | "INSTRUCTOR"
  | "SYSTEM";

/** Ordered hierarchy — lower index = more authority */
export const ORG_HIERARCHY: OrgNode[] = [
  "BOARD",
  "EXECUTIVE",
  "DEPARTMENT_HEAD",
  "PROGRAM_LEAD",
  "INSTRUCTOR",
  "SYSTEM",
] as const;

export type AutomationLevel = "FULL" | "LIMITED" | "LOCKED";

export interface BoardPolicy {
  id: string;
  departmentId: string | null;
  automationLevel: AutomationLevel;
  maxAutoRiskThreshold: number;
  allowedAutoActions: string[];
  forbiddenActions: string[];
}

export interface GovernanceDecision {
  allowed: boolean;
  /** The minimum OrgNode level that must approve this action */
  requiredApprovalLevel: OrgNode | null;
  /** Ordered list of OrgNode levels to notify/escalate through */
  escalationPath: OrgNode[];
  reason: string;
}

export interface GovernanceAuditEvent {
  actionPlanId:     string;
  actionType:       string;
  departmentId:     string;
  decision:         "ALLOWED" | "BLOCKED" | "ESCALATED";
  requiredLevel:    OrgNode | null;
  reason:           string;
  boardPolicyId:    string | null;
  automationLevel:  AutomationLevel;
  forecastRunId:    string;
  /** Likelihood from the source ForwardRiskSignal — stored for policy simulation replay */
  sourceLikelihood: number;
}

// ─── Action Result ────────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
