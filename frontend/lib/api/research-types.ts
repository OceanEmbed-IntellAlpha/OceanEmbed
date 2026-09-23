export type ExperimentStatus = 'BASELINE' | 'TESTING' | 'COMPLETED' | 'KEEP' | 'REJECTED' | 'INCONCLUSIVE' | 'VALIDATION' | 'PENDING';

export type ExperimentCategory =
  | 'Data formulation'
  | 'Loss ablation'
  | 'Architecture'
  | 'Variable ablation'
  | 'Data & Inputs'
  | 'Spatial Representation'
  | 'Ocean Embedding'
  | 'Depth Reconstruction'
  | 'Temporal Dynamics'
  | 'Physical Constraints'
  | 'Robustness & Uncertainty'
  | 'Ocean Regimes'
  | 'Validation';

export interface ExperimentMetrics {
  rmse?: number[];
  correlation?: number[];
  bias?: number[];
  depths?: number[];
}

export interface Experiment {
  id: string;
  category: ExperimentCategory;
  title: string;
  question: string;
  motivation?: string;
  baseline: string;
  variant: string;
  purpose?: string;
  metrics?: ExperimentMetrics;
  finding?: string;
  decision: ExperimentStatus;
  decisionReason?: string;
  nextExperiment?: string;
  visuals?: string[];
}
