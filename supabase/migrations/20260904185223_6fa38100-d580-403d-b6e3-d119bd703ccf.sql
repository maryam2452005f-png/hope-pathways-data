-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'technologist', 'patient');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','technologist'));
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- New user bootstrap: profile + requested role (patient or technologist only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requested text;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  requested := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  IF requested NOT IN ('patient','technologist') THEN
    requested := 'patient';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Protocols (public guidelines)
CREATE TABLE public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  tumor_type text,
  version text NOT NULL DEFAULT 'v1.0',
  summary text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.protocols TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocols TO authenticated;
GRANT ALL ON public.protocols TO service_role;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocols_public_read" ON public.protocols FOR SELECT USING (true);
CREATE POLICY "protocols_staff_write" ON public.protocols FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "protocols_staff_update" ON public.protocols FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "protocols_staff_delete" ON public.protocols FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER protocols_touch BEFORE UPDATE ON public.protocols FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Patients
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL UNIQUE,
  full_name text NOT NULL,
  date_of_birth date,
  sex text,
  tumor_type text NOT NULL,
  primary_site text,
  stage text,
  diagnosis_date date,
  status text NOT NULL DEFAULT 'active',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_staff_all" ON public.patients FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "patients_read_own" ON public.patients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER patients_touch BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Examinations
CREATE TABLE public.examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  modality text,
  body_region text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  performed_at timestamptz,
  status text NOT NULL DEFAULT 'requested',
  priority text NOT NULL DEFAULT 'routine',
  protocol_id uuid REFERENCES public.protocols(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.examinations TO authenticated;
GRANT ALL ON public.examinations TO service_role;
ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams_staff_all" ON public.examinations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "exams_read_own" ON public.examinations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = examinations.patient_id AND p.user_id = auth.uid()));
CREATE TRIGGER examinations_touch BEFORE UPDATE ON public.examinations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Results
CREATE TABLE public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_id uuid NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  findings text NOT NULL DEFAULT '',
  impression text,
  measurements jsonb NOT NULL DEFAULT '[]'::jsonb,
  abnormal boolean NOT NULL DEFAULT false,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT ALL ON public.exam_results TO service_role;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_staff_all" ON public.exam_results FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "results_read_own_approved" ON public.exam_results FOR SELECT TO authenticated
  USING (review_status = 'approved' AND EXISTS (
    SELECT 1 FROM public.examinations e JOIN public.patients p ON p.id = e.patient_id
    WHERE e.id = exam_results.examination_id AND p.user_id = auth.uid()));
CREATE TRIGGER exam_results_touch BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Quality control checks
CREATE TABLE public.qc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment text NOT NULL,
  check_type text NOT NULL,
  performed_on date NOT NULL DEFAULT current_date,
  outcome text NOT NULL DEFAULT 'pass',
  measured_value text,
  tolerance text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qc_checks TO authenticated;
GRANT ALL ON public.qc_checks TO service_role;
ALTER TABLE public.qc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qc_staff_all" ON public.qc_checks FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Seed protocols
INSERT INTO public.protocols (id, title, category, tumor_type, version, summary, steps, source) VALUES
('11111111-1111-1111-1111-111111111111','Contrast-enhanced CT chest/abdomen for staging','Imaging','Lung carcinoma','v2.1','Baseline and follow-up CT acquisition for solid tumour staging with RECIST 1.1 measurable disease assessment.','["Confirm renal function (eGFR > 30) and contrast allergy history","Fast 4 hours; hydrate with oral water 500 mL","Inject 80-100 mL iodinated contrast at 3 mL/s, portal venous phase at 70 s","Slice thickness 1.25 mm, reconstruct axial/coronal/sagittal","Record target lesions per RECIST 1.1 with long-axis diameters","Radiologist reports within 24 h; second read required for stage change"]','RECIST 1.1 / institutional imaging SOP'),
('22222222-2222-2222-2222-222222222222','MRI brain with gadolinium for CNS involvement','Imaging','Glioma / brain metastasis','v1.8','Standardised brain MRI protocol for tumour detection, oedema mapping and post-treatment response.','["Screen for implants, pacemakers and pregnancy","Sequences: 3D T1 pre/post, T2 FLAIR, DWI, SWI, perfusion","Gadolinium 0.1 mmol/kg IV, post-contrast at 5 minutes","Slice 1 mm isotropic for surgical navigation","Apply RANO criteria for response assessment","Flag new enhancement > 10 mm to the tumour board same day"]','RANO criteria'),
('33333333-3333-3333-3333-333333333333','Somatic tumour gene panel (NGS) workflow','Genetic','Solid tumours','v3.0','Next-generation sequencing of a 52-gene solid tumour panel from FFPE tissue, including variant interpretation.','["Verify tumour cellularity >= 20% on H&E","Extract DNA/RNA; require >= 10 ng DNA at A260/280 1.8-2.0","Library prep with unique molecular identifiers","Sequence to >= 500x mean coverage, >= 95% of target at 100x","Call variants; filter germline using paired normal or population databases","Classify per AMP/ASCO/CAP tiers and report actionable variants with therapy links"]','AMP/ASCO/CAP variant tiers'),
('44444444-4444-4444-4444-444444444444','Tumour marker biochemistry panel','Laboratory','Multiple','v1.4','Serum tumour marker measurement and trend interpretation alongside imaging.','["Draw serum before any imaging contrast or chemotherapy dose","Centrifuge within 2 hours; store at -20 C if delayed","Run CEA, CA 19-9, CA 125, AFP, LDH per assay SOP","Include two levels of internal quality control per run","Report with assay-specific reference interval and prior value delta","Escalate a doubling from baseline to the treating oncologist"]','Institutional laboratory SOP'),
('55555555-5555-5555-5555-555555555555','Germline predisposition testing and counselling','Genetic','Breast / ovarian / colorectal','v2.2','Germline BRCA1/2 and Lynch syndrome testing pathway with pre- and post-test counselling.','["Document three-generation family pedigree","Obtain written informed consent for germline analysis","Collect EDTA whole blood or saliva kit","Sequence BRCA1, BRCA2, PALB2, MLH1, MSH2, MSH6, PMS2, EPCAM with CNV analysis","Report pathogenic and likely pathogenic variants only; list VUS separately","Arrange genetic counselling within 14 days of the report"]','NCCN genetic/familial high-risk guidance');

-- Seed patients
INSERT INTO public.patients (id, mrn, full_name, date_of_birth, sex, tumor_type, primary_site, stage, diagnosis_date, status) VALUES
('aaaaaaa1-0000-4000-8000-000000000001','ONC-10241','Hala Mansour','1968-04-12','Female','Invasive ductal carcinoma','Left breast','IIB','2026-01-18','active'),
('aaaaaaa1-0000-4000-8000-000000000002','ONC-10242','Karim El-Sayed','1955-11-02','Male','Adenocarcinoma','Right lung, upper lobe','IIIA','2025-11-27','active'),
('aaaaaaa1-0000-4000-8000-000000000003','ONC-10243','Nadia Fahmy','1979-07-23','Female','High-grade serous carcinoma','Ovary','IIIC','2026-02-09','active'),
('aaaaaaa1-0000-4000-8000-000000000004','ONC-10244','Omar Rashid','1990-03-30','Male','Glioblastoma','Left temporal lobe','IV','2026-03-04','in treatment'),
('aaaaaaa1-0000-4000-8000-000000000005','ONC-10245','Sara Abdelaziz','1972-09-15','Female','Colorectal adenocarcinoma','Sigmoid colon','IIA','2025-12-12','remission');

-- Seed examinations
INSERT INTO public.examinations (id, patient_id, category, name, modality, body_region, requested_at, performed_at, status, priority, protocol_id, notes) VALUES
('bbbbbbb1-0000-4000-8000-000000000001','aaaaaaa1-0000-4000-8000-000000000001','Imaging','Staging CT chest/abdomen/pelvis','CT','Chest, abdomen, pelvis','2026-08-10 08:00+00','2026-08-12 09:20+00','reported','routine','11111111-1111-1111-1111-111111111111','Baseline before adjuvant therapy'),
('bbbbbbb1-0000-4000-8000-000000000002','aaaaaaa1-0000-4000-8000-000000000001','Genetic','Germline BRCA1/2 + panel','NGS','Blood','2026-08-11 10:15+00','2026-08-18 12:00+00','reported','routine','55555555-5555-5555-5555-555555555555','Family history of breast cancer'),
('bbbbbbb1-0000-4000-8000-000000000003','aaaaaaa1-0000-4000-8000-000000000002','Imaging','Follow-up CT chest with contrast','CT','Chest','2026-08-20 07:30+00','2026-08-21 10:05+00','reported','urgent','11111111-1111-1111-1111-111111111111','Cycle 4 response assessment'),
('bbbbbbb1-0000-4000-8000-000000000004','aaaaaaa1-0000-4000-8000-000000000002','Genetic','Somatic 52-gene NGS panel','NGS','Lung biopsy (FFPE)','2026-08-20 07:40+00','2026-08-28 14:30+00','reported','routine','33333333-3333-3333-3333-333333333333','Targeted therapy eligibility'),
('bbbbbbb1-0000-4000-8000-000000000005','aaaaaaa1-0000-4000-8000-000000000003','Laboratory','Tumour marker panel (CA 125, CEA, LDH)','Serum assay','Blood','2026-08-25 08:10+00','2026-08-25 11:40+00','reported','routine','44444444-4444-4444-4444-444444444444','Post-cycle 3 trend'),
('bbbbbbb1-0000-4000-8000-000000000006','aaaaaaa1-0000-4000-8000-000000000004','Imaging','MRI brain with gadolinium','MRI','Brain','2026-08-30 09:00+00','2026-09-01 13:15+00','reported','urgent','22222222-2222-2222-2222-222222222222','Post-radiotherapy RANO assessment'),
('bbbbbbb1-0000-4000-8000-000000000007','aaaaaaa1-0000-4000-8000-000000000005','Laboratory','CEA surveillance','Serum assay','Blood','2026-09-02 08:00+00',NULL,'requested','routine','44444444-4444-4444-4444-444444444444','6-month surveillance draw'),
('bbbbbbb1-0000-4000-8000-000000000008','aaaaaaa1-0000-4000-8000-000000000003','Imaging','MRI pelvis','MRI','Pelvis','2026-09-03 08:45+00',NULL,'scheduled','routine','22222222-2222-2222-2222-222222222222','Assess residual pelvic disease');

-- Seed results
INSERT INTO public.exam_results (examination_id, findings, impression, measurements, abnormal, review_status, reviewed_at, review_notes) VALUES
('bbbbbbb1-0000-4000-8000-000000000001','Left breast mass with two enlarged level I axillary nodes. No pulmonary, hepatic or skeletal lesions identified.','Locoregional disease only; no distant metastasis.','[{"label":"Primary lesion","value":"26","unit":"mm","reference":"target lesion, RECIST"},{"label":"Largest axillary node","value":"14","unit":"mm","reference":"< 10 mm normal"}]',true,'approved','2026-08-13 07:30+00','Measurements verified against prior mammogram.'),
('bbbbbbb1-0000-4000-8000-000000000002','Pathogenic variant detected in BRCA2 (c.5946delT, p.Ser1982Argfs*22). No other pathogenic variants across the panel.','Germline BRCA2 pathogenic variant — PARP inhibitor eligible; cascade family testing advised.','[{"label":"BRCA2 c.5946delT","value":"Pathogenic (Tier I)","unit":"","reference":"AMP/ASCO/CAP"},{"label":"Mean coverage","value":"612","unit":"x","reference":">= 500x"}]',true,'approved','2026-08-19 09:10+00','Second analyst confirmed variant call and coverage metrics.'),
('bbbbbbb1-0000-4000-8000-000000000003','Right upper lobe mass reduced from 42 mm to 29 mm. Mediastinal nodes smaller. No new lesions.','Partial response by RECIST 1.1.','[{"label":"RUL mass","value":"29","unit":"mm","reference":"prior 42 mm"},{"label":"Sum of target lesions change","value":"-31","unit":"%","reference":"PR <= -30%"}]',true,'approved','2026-08-22 06:50+00','Response category cross-checked by second radiologist.'),
('bbbbbbb1-0000-4000-8000-000000000004','EGFR exon 19 deletion detected. TP53 missense variant present. ALK, ROS1, BRAF wild type. TMB low.','Actionable EGFR exon 19 deletion — osimertinib candidate.','[{"label":"EGFR ex19del VAF","value":"38.4","unit":"%","reference":"> 5% reportable"},{"label":"Tumour cellularity","value":"45","unit":"%","reference":">= 20%"}]',true,'pending',NULL,NULL),
('bbbbbbb1-0000-4000-8000-000000000005','CA 125 falling steadily since baseline. CEA and LDH within reference interval.','Biochemical response consistent with imaging.','[{"label":"CA 125","value":"48","unit":"U/mL","reference":"< 35 U/mL (baseline 612)"},{"label":"CEA","value":"2.1","unit":"ng/mL","reference":"< 5 ng/mL"},{"label":"LDH","value":"198","unit":"U/L","reference":"120-246 U/L"}]',true,'approved','2026-08-26 08:05+00','Assay internal controls in range.'),
('bbbbbbb1-0000-4000-8000-000000000006','Resection cavity with peripheral enhancement, unchanged from prior. FLAIR oedema slightly reduced. No new enhancing lesion.','Stable disease by RANO; findings favour treatment effect over progression.','[{"label":"Enhancing rim thickness","value":"4","unit":"mm","reference":"prior 4 mm"},{"label":"FLAIR oedema volume","value":"18.2","unit":"mL","reference":"prior 21.6 mL"}]',false,'pending',NULL,NULL);

-- Seed QC checks
INSERT INTO public.qc_checks (equipment, check_type, performed_on, outcome, measured_value, tolerance, notes) VALUES
('CT scanner 1 (64-slice)','Daily water phantom CT number','2026-09-03','pass','0.4 HU','+/- 4 HU','Warm-up completed before scan.'),
('CT scanner 1 (64-slice)','Monthly slice thickness accuracy','2026-08-31','pass','1.28 mm','1.25 mm +/- 0.15','Ramp phantom verified.'),
('MRI 1.5T','Daily signal-to-noise ratio','2026-09-03','pass','142','>= 120','Head coil, standard phantom.'),
('MRI 1.5T','Weekly geometric distortion','2026-08-29','fail','2.6 mm','<= 2.0 mm','Gradient calibration requested; unit flagged for engineer.'),
('NGS sequencer A','Run-level coverage uniformity','2026-08-28','pass','96.4%','>= 95% at 100x','No-template control clean.'),
('Chemistry analyser B','Two-level internal QC (CA 125)','2026-09-02','pass','Level 1 32 U/mL / Level 2 118 U/mL','within 2 SD','Levey-Jennings chart in control.'),
('Chemistry analyser B','Calibration verification (CEA)','2026-08-27','pass','r = 0.999','r >= 0.995','Five-point calibration.');