DROP POLICY IF EXISTS protocols_public_read ON public.protocols;

REVOKE SELECT ON public.protocols FROM anon;
GRANT SELECT ON public.protocols TO authenticated;

CREATE POLICY protocols_authenticated_read
ON public.protocols
FOR SELECT
TO authenticated
USING (true);