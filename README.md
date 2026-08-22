# Clinician Compass

Build "AI Health Companion — Doctor Dashboard": a complete, production-ready React + TypeScript + Vite + Tailwind CSS web app (shadcn/ui on top of Tailwind is fine). This is the clinician-facing half of a two-app health system — a separate patient app already exists and shares this exact same backend. This is a distinct deployable product, not a role-based view inside the patient app. Work efficiently and prioritize finishing every screen fully functional over polish — must compile and deploy cleanly in this single pass.

CONNECT TO THIS EXISTING SUPABASE PROJECT (do not provision a new Lovable-managed database):
- Project URL: https://hmrdsqgbyoysmfdhmlkw.supabase.co
- Publishable/anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcmRzcWdieW95c21mZGhtbGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzY1NzcsImV4cCI6MjEwMjUxMjU3N30.5zmw0C3wd6vgqYvxydf75ywjvS7X_6VnQFOv2Pk_ouc
Install @supabase/supabase-js, typed client, query directly with the anon key. RLS already restricts doctors to only see patients who have an active row in `doctor_patient_links` linking to them — never try to bypass this.

RELEVANT SCHEMA (already live, do not modify): doctors(id, full_name, license_number, clinician_verified_at) — id equals the authenticated user's auth id. doctor_patient_links(id, patient_id, doctor_id, status[active|revoked], authorized_at). patients(id, full_name, date_of_birth). medical_history(id, patient_id, condition_name, icd10_code, status, diagnosed_date, notes). allergies(id, patient_id, allergen, reaction, severity). medications(id, patient_id, drug_name, dosage, frequency, active). symptoms(id, patient_id, description, body_location, onset_date, severity, source). lab_results(id, patient_id, test_name, value, unit, reference_range, ingestion_path, reviewed_and_corrected). differential_diagnoses(id, patient_id, rank, condition_name, icd10_code, probability_score, confidence_tier[well_established|moderate|rare_contested], urgency, disclosed_to_patient, doctor_confirmed, confirmed_at, confirmed_by). diagnosis_evidence(id, diagnosis_id, source[faers|drugbank|icd10|pubmed|geo_epi|medical_history|reddit_hypothesis], contribution_weight, detail). allergy_contraindication_flags(id, patient_id, medication_id, allergy_id, detail, resolved). drug_interaction_flags(id, patient_id, medication_id, source, severity[info|caution|high], detail). soap_notes(id, patient_id, doctor_id, diagnosis_id, subjective, objective, assessment, plan, ai_drafted, finalized_at). treatment_options(id, diagnosis_id, drug_name, standard_dosing_reference, guideline_source, doctor_selected, selected_by, selected_at). wellbeing_checkins(id, patient_id, mood_rating, notes, created_at). crisis_escalations(id, patient_id, severity, status). community_contextual_insights(id, patient_id, pattern_summary, source_ref). validation_records(id, diagnosis_id, condition_category, hit_criteria, was_hit, doctor_confirmed_condition).

AUTH: Supabase email/password. On sign-up call supabase.auth.signUp with options.data = { role: 'doctor', full_name, license_number }. A DB trigger auto-creates the matching `doctors` row — never insert into `doctors` manually. Build one polished, clinical-feeling auth screen (sign-in/sign-up with a license number field, validation, loading/error states) and a protected route wrapper.

BUILD ALL OF THESE AS REAL, FULLY WORKING SCREENS AGAINST THE LIVE DATABASE:

1. Patient Roster (home): list every patient with an active `doctor_patient_links` row to this doctor (join `patients`), showing name, any open `crisis_escalations`, count of undisclosed high-urgency `differential_diagnoses`. Click through to a patient's dossier.

2. Consolidated Patient Dossier (per-patient page): tabs or sections showing that patient's `medical_history`, `allergies`, `medications`, `symptoms` timeline, and `lab_results` — read-only, pulled live via the active link.

3. Ranked Differential Diagnosis Panel (within the dossier): list `differential_diagnoses` for that patient ordered by rank, each showing confidence_tier as a visible tier badge (never a bare percentage as the headline — show the tier prominently, probability_score as small supporting text). CRITICAL UX RULE: each row must be collapsed by default showing only condition_name + tier + urgency; the doctor must click "Why?" to expand and see the joined `diagnosis_evidence` rows (source + detail) before any confirm action becomes available — never let them confirm without expanding.

4. Safety Flags: a distinct, visually separated (e.g. red/amber bordered) panel showing `allergy_contraindication_flags` and `drug_interaction_flags` for the patient, with a "Mark resolved" action.

5. Community Contextual Insights: a clearly separate, muted/labeled section (never inside the diagnosis panel) showing `community_contextual_insights` for the patient, labeled "Community pattern — not clinical evidence".

6. SOAP Note Assist: for a selected diagnosis, show/create a `soap_notes` row pre-filled as a draft (ai_drafted=true) with editable Subjective/Objective/Assessment/Plan textareas; a "Finalize" button that sets finalized_at=now() and ai_drafted=false.

7. Treatment Options: only visible after the doctor has set `doctor_confirmed=true` on a diagnosis (build that confirm action here, setting confirmed_at=now(), confirmed_by=doctor id). Once confirmed, list/add `treatment_options` for that diagnosis with a "Select" button that sets doctor_selected=true, selected_by, selected_at (only one selected at a time per diagnosis).

8. Feedback Loop: a simple form to record the doctor's final confirmed diagnosis post-workup into `validation_records` (condition_category text input, hit_criteria select top_1/top_3, was_hit checkbox, doctor_confirmed_condition text).

9. Longitudinal Monitoring: per-patient view combining a `wellbeing_checkins` mood trend chart, a `symptoms` trajectory timeline, medication adherence context (from active `medications`), and any open `crisis_escalations` surfaced prominently at the top if present.

10. Settings/Profile: edit the doctor's own `doctors` row (full_name, license_number).

DESIGN: Professional clinical dashboard feel — denser than a consumer app but still clean: cool blues/slates, clear data hierarchy, sidebar nav on desktop + responsive collapse on mobile, data tables/cards for patient lists, badges for tiers/urgency/severity color-coded consistently (red=high/emergency, amber=caution/moderate, green=low/well-established-benign), loading skeletons, empty states, toast notifications on every mutation. Wire all 10 screens into the nav. Zero console errors, zero dead links, genuinely deployable when done.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a82eefd7-db72-4914-acb9-ab3683b22256).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
