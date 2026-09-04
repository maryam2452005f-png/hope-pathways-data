CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','technologist'));
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

DROP POLICY "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.is_staff(auth.uid()));
DROP POLICY "roles_select_own" ON public.user_roles;
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "protocols_staff_write" ON public.protocols;
CREATE POLICY "protocols_staff_write" ON public.protocols FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "protocols_staff_update" ON public.protocols;
CREATE POLICY "protocols_staff_update" ON public.protocols FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
DROP POLICY "protocols_staff_delete" ON public.protocols;
CREATE POLICY "protocols_staff_delete" ON public.protocols FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

DROP POLICY "patients_staff_all" ON public.patients;
CREATE POLICY "patients_staff_all" ON public.patients FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "exams_staff_all" ON public.examinations;
CREATE POLICY "exams_staff_all" ON public.examinations FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "results_staff_all" ON public.exam_results;
CREATE POLICY "results_staff_all" ON public.exam_results FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY "qc_staff_all" ON public.qc_checks;
CREATE POLICY "qc_staff_all" ON public.qc_checks FOR ALL TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);