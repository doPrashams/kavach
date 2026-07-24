export type AgentName =
  | "sentinel"
  | "investigator"
  | "impact_analyst"
  | "ml_guardian"
  | "fixer"
  | "scribe"
  | "comms";

export interface AgentEvent {
  id: string;
  run_id: string;
  agent: AgentName;
  event_type: string;
  message: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface BlastRadiusEntity {
  urn: string;
  name: string;
  entity_type: string;
  via_column?: string | null;
}

export interface BlastRadius {
  source_urn: string;
  datasets: BlastRadiusEntity[];
  dashboards: BlastRadiusEntity[];
  ml_models: BlastRadiusEntity[];
  ml_deployments: BlastRadiusEntity[];
}

export interface FixPlan {
  summary: string;
  steps: string[];
  target_entities?: string[];
  safeguard_assertion?: string | null;
  hold_recommendation?: boolean;
}

export interface FixArtifacts {
  scenario: string;
  branch_name: string;
  files: Record<string, string>;
  pr_title: string;
  pr_body: string;
  diff: string;
  incident_id?: string | null;
  blast_radius_summary?: string;
}

export interface RunState {
  run_id: string;
  incident_id?: string | null;
  incident_urn?: string | null;
  trigger: Record<string, unknown>;
  status: string;
  severity: string;
  root_cause?: string | null;
  findings: string[];
  blast_radius?: BlastRadius | null;
  ml_risk: string;
  ml_hold_recommended: boolean;
  fix_plan?: FixPlan | null;
  postmortem?: string | null;
  timeline: AgentEvent[];
  notification_sent: boolean;
}

export interface ChaosScenario {
  id: string;
  label: string;
  simulated?: boolean;
}

export interface MttrPoint {
  run_id: string;
  scenario?: string | null;
  mttr_seconds: number;
  cited_prior: boolean;
  recorded_at: string;
}

export interface FixResponse {
  run_id: string;
  pr_ref?: string | null;
  artifacts: FixArtifacts;
}

export interface DemoFixture {
  recordingId: string;
  run: RunState;
  events: AgentEvent[];
  fix: FixResponse;
  mttrTrend: MttrPoint[];
  scenarios: ChaosScenario[];
}
