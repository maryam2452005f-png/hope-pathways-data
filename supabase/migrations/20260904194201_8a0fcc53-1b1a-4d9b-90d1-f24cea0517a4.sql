ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE requested text; uname text;
BEGIN
  uname := lower(COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email, '@', 1)));

  INSERT INTO public.profiles (id, full_name, email, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, uname)
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
$function$;

UPDATE public.profiles SET username = lower(split_part(email, '@', 1)) WHERE username IS NULL AND email IS NOT NULL;