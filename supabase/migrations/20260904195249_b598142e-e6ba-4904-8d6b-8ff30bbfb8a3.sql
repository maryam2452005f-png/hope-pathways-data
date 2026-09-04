ALTER TABLE public.qc_checks
  ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'radiology';

ALTER TABLE public.qc_checks
  ADD CONSTRAINT qc_checks_discipline_check CHECK (discipline IN ('radiology','lab'));

UPDATE public.qc_checks
SET discipline = 'lab'
WHERE equipment ILIKE '%sequenc%'
   OR equipment ILIKE '%analys%'
   OR equipment ILIKE '%analyz%'
   OR equipment ILIKE '%pipette%'
   OR equipment ILIKE '%centrifuge%'
   OR equipment ILIKE '%pcr%'
   OR check_type ILIKE '%reagent%';

CREATE INDEX IF NOT EXISTS qc_checks_discipline_idx ON public.qc_checks (discipline, performed_on DESC);