export type ConfidenceTier = "well_established" | "moderate" | "rare_contested";
export type FlagSeverity = "info" | "caution" | "high";

export interface Doctor {
  id: string;
  full_name: string | null;
  license_number: string | null;
  clinician_verified_at: string | null;
}
export interface Patient {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
}
export interface MedicalHistory {
  id: string;
  patient_id: string;
  condition_name: string | null;
  icd10_code: string | null;
  status: string | null;
  diagnosed_date: string | null;
  notes: string | null;
}
export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string | null;
  reaction: string | null;
  severity: string | null;
}
export interface Medication {
  id: string;
  patient_id: string;
  drug_name: string | null;
  dosage: string | null;
  frequency: string | null;
  active: boolean | null;
}
export interface Symptom {
  id: string;
  patient_id: string;
  description: string | null;
  body_location: string | null;
  onset_date: string | null;
  severity: number | string | null;
  source: string | null;
}
export interface LabResult {
  id: string;
  patient_id: string;
  test_name: string | null;
  value: string | number | null;
  unit: string | null;
  reference_range: string | null;
  ingestion_path: string | null;
  reviewed_and_corrected: boolean | null;
}
export interface DifferentialDiagnosis {
  id: string;
  patient_id: string;
  rank: number | null;
  condition_name: string | null;
  icd10_code: string | null;
  probability_score: number | null;
  confidence_tier: ConfidenceTier | null;
  urgency: string | null;
  disclosed_to_patient: boolean | null;
  doctor_confirmed: boolean | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
}
export interface DiagnosisEvidence {
  id: string;
  diagnosis_id: string;
  source: string | null;
  contribution_weight: number | null;
  detail: string | null;
}
export interface AllergyFlag {
  id: string;
  patient_id: string;
  medication_id: string | null;
  allergy_id: string | null;
  detail: string | null;
  resolved: boolean | null;
}
export interface InteractionFlag {
  id: string;
  patient_id: string;
  medication_id: string | null;
  source: string | null;
  severity: FlagSeverity | null;
  detail: string | null;
}
export interface SoapNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis_id: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  ai_drafted: boolean | null;
  finalized_at: string | null;
}
export interface TreatmentOption {
  id: string;
  diagnosis_id: string;
  drug_name: string | null;
  standard_dosing_reference: string | null;
  guideline_source: string | null;
  doctor_selected: boolean | null;
  selected_by: string | null;
  selected_at: string | null;
}
export interface WellbeingCheckin {
  id: string;
  patient_id: string;
  mood_rating: number | null;
  notes: string | null;
  created_at: string | null;
}
export interface CrisisEscalation {
  id: string;
  patient_id: string;
  severity: string | null;
  status: string | null;
}
export interface CommunityInsight {
  id: string;
  patient_id: string;
  pattern_summary: string | null;
  source_ref: string | null;
}
export interface ValidationRecord {
  id: string;
  diagnosis_id: string;
  condition_category: string | null;
  hit_criteria: string | null;
  was_hit: boolean | null;
  doctor_confirmed_condition: string | null;
}

export const OPEN_CRISIS_STATUSES = ["open", "active", "pending", "escalated"];